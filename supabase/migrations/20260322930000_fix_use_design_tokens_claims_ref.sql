-- use_design_tokens: pending 환불 체크 테이블 수정
--
-- 20260322600000에서 use_design_tokens가 구 테이블 public.token_refund_requests를 참조했으나
-- 20260322100000(merge_token_refund_into_claims)에서 claims 테이블로 통합됐다.
-- 올바른 테이블(public.claims)과 상태값('접수')으로 수정한다.

CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id      uuid,
  p_ai_model     text,
  p_request_type text,
  p_quality      text DEFAULT 'standard'
)
RETURNS jsonb
LANGUAGE plpgsql
-- SECURITY DEFINER 사유: authenticated 역할에 INSERT 권한이 없는 design_tokens 테이블에
-- 차감 레코드를 직접 기록해야 하므로 SECURITY DEFINER를 사용한다.
-- 함수 내부에서 service_role JWT claim 또는 auth.uid() = p_user_id 비교로 소유권을 검증한다.
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cost_key     text;
  v_cost         integer;
  v_total_bal    integer;
  v_paid_bal     integer;
  v_bonus_bal    integer;
  v_caller_role  text;
BEGIN
  -- 소유권 검증: service_role이 아닌 경우 auth.uid() 일치 확인
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  -- 파라미터 화이트리스트 검증
  IF p_ai_model NOT IN ('openai', 'gemini') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;
  IF p_request_type NOT IN ('text_only', 'text_and_image') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;
  IF p_quality NOT IN ('standard', 'high') THEN
    RAISE EXCEPTION 'invalid quality: %', p_quality;
  END IF;

  -- 동시 요청에 대한 advisory lock (사용자별)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- admin_settings에서 비용 조회
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

  SELECT value::integer
    INTO v_cost
    FROM public.admin_settings
   WHERE key = v_cost_key;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'cost not configured for key: %', v_cost_key;
  END IF;

  -- pending 환불 체크: 구 token_refund_requests 대신 claims 테이블 참조
  IF EXISTS (
    SELECT 1 FROM public.claims
    WHERE user_id = p_user_id
      AND type = 'token_refund'
      AND status = '접수'
  ) THEN
    SELECT COALESCE(SUM(amount), 0)::integer
      INTO v_total_bal
      FROM public.design_tokens
     WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'refund_pending',
      'balance', v_total_bal,
      'cost', v_cost
    );
  END IF;

  -- 클래스별 잔액 조회
  SELECT COALESCE(SUM(amount), 0)::integer
  INTO v_paid_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id AND token_class = 'paid';

  SELECT COALESCE(SUM(amount), 0)::integer
  INTO v_bonus_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id AND token_class = 'bonus';

  v_total_bal := v_paid_bal + v_bonus_bal;

  -- 잔액 부족 검사
  IF v_total_bal < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'balance', v_total_bal,
      'cost', v_cost
    );
  END IF;

  -- paid 먼저 차감, 부족분은 bonus에서 차감
  IF v_paid_bal >= v_cost THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description
    ) VALUES (
      p_user_id, -v_cost, 'use', 'paid',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
    );
  ELSE
    -- paid 잔액 전부 차감
    IF v_paid_bal > 0 THEN
      INSERT INTO public.design_tokens (
        user_id, amount, type, token_class, ai_model, request_type, description
      ) VALUES (
        p_user_id, -v_paid_bal, 'use', 'paid',
        p_ai_model, p_request_type,
        'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
      );
    END IF;
    -- 나머지는 bonus에서 차감
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description
    ) VALUES (
      p_user_id, -(v_cost - v_paid_bal), 'use', 'bonus',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cost', v_cost,
    'balance', v_total_bal - v_cost
  );
END;
$$;
