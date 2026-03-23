-- fix: use_design_tokens에서 존재하지 않는 token_refund_requests 테이블 참조 제거
-- token_refund_requests 대신 claims 테이블로 환불 대기 상태 확인

CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id      uuid,
  p_ai_model     text,
  p_request_type text,
  p_quality      text DEFAULT 'standard',
  p_work_id      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cost_key     text;
  v_cost         integer;
  v_paid_bal     integer;
  v_bonus_bal    integer;
  v_total_bal    integer;
  v_paid_deduct  integer;
  v_bonus_deduct integer;
  v_caller_role  text;
BEGIN
  -- 소유권 검증
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  IF p_ai_model NOT IN ('openai', 'gemini') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;
  IF p_request_type NOT IN ('text_only', 'text_and_image') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;
  IF p_quality NOT IN ('standard', 'high') THEN
    RAISE EXCEPTION 'invalid quality: %', p_quality;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_cost_key := CASE
    WHEN p_request_type = 'text_and_image' AND p_quality = 'high'
      THEN 'design_token_cost_' || p_ai_model || '_image_high'
    ELSE
      'design_token_cost_' || p_ai_model || '_' ||
      CASE p_request_type
        WHEN 'text_and_image' THEN 'image'
        ELSE 'text'
      END
  END;

  SELECT value::integer INTO v_cost
    FROM public.admin_settings WHERE key = v_cost_key;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'cost not configured for key: %', v_cost_key;
  END IF;

  -- pending 환불 체크: claims 테이블 참조
  IF EXISTS (
    SELECT 1 FROM public.claims
    WHERE user_id = p_user_id
      AND type = 'token_refund'
      AND status = '접수'
  ) THEN
    SELECT COALESCE(SUM(amount), 0)::integer INTO v_total_bal
      FROM public.design_tokens WHERE user_id = p_user_id;
    RETURN jsonb_build_object('success', false, 'error', 'refund_pending', 'balance', v_total_bal, 'cost', v_cost);
  END IF;

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer,
    COALESCE(SUM(amount) FILTER (WHERE token_class IN ('bonus', 'free')), 0)::integer
  INTO v_paid_bal, v_bonus_bal
  FROM public.design_tokens WHERE user_id = p_user_id;

  v_total_bal := v_paid_bal + v_bonus_bal;

  IF v_total_bal < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_tokens', 'balance', v_total_bal, 'cost', v_cost);
  END IF;

  v_paid_deduct  := LEAST(v_cost, v_paid_bal);
  v_bonus_deduct := v_cost - v_paid_deduct;

  -- 유료 차감 (work_id: p_work_id || '_use_paid')
  IF v_paid_deduct > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description, work_id
    ) VALUES (
      p_user_id, -v_paid_deduct, 'use', 'paid',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 유료',
      CASE WHEN p_work_id IS NOT NULL THEN p_work_id || '_use_paid' ELSE NULL END
    )
    ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
  END IF;

  -- 보너스 차감 (work_id: p_work_id || '_use_bonus')
  IF v_bonus_deduct > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description, work_id
    ) VALUES (
      p_user_id, -v_bonus_deduct, 'use', 'bonus',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 보너스',
      CASE WHEN p_work_id IS NOT NULL THEN p_work_id || '_use_bonus' ELSE NULL END
    )
    ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'cost', v_cost, 'balance', v_total_bal - v_cost);
END;
$$;
