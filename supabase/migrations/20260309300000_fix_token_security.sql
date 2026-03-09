-- Design token: fix dynamic cost-key validation and secure/idempotent refunds

-- 1. Add work_id for refund idempotency
ALTER TABLE public.design_tokens
  ADD COLUMN IF NOT EXISTS work_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_design_tokens_work_id
  ON public.design_tokens (work_id)
  WHERE work_id IS NOT NULL;

-- 2. Harden use_design_tokens input validation and fail closed on missing cost
--    SECURITY DEFINER 유지 사유: advisory lock + design_tokens INSERT는 RLS로 허용되지 않음
--    service_role(Edge Function)에서 호출 시 소유권 검증 면제
CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id      uuid,
  p_ai_model     text,
  p_request_type text,
  p_quality      text DEFAULT 'standard'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cost_key    text;
  v_cost        integer;
  v_balance     integer;
  v_caller_role text;
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
  -- p_quality는 text_and_image/image 요청에만 적용된다.
  -- text_only 요청은 이미지 생성 없이 텍스트 처리만 하므로
  -- 품질 등급(standard/high)이 비용에 영향을 주지 않는다(의도적 설계).
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

  -- 현재 잔액 조회 (만료된 토큰 제외)
  SELECT COALESCE(SUM(amount), 0)::integer
    INTO v_balance
    FROM public.design_tokens
   WHERE user_id = p_user_id
     AND (expires_at IS NULL OR expires_at > now());

  -- 잔액 부족 검사
  IF v_balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'balance', v_balance,
      'cost', v_cost
    );
  END IF;

  -- 토큰 차감
  INSERT INTO public.design_tokens (user_id, amount, type, ai_model, request_type, description)
  VALUES (
    p_user_id,
    -v_cost,
    'use',
    p_ai_model,
    p_request_type,
    'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
  );

  RETURN jsonb_build_object(
    'success', true,
    'cost', v_cost,
    'balance', v_balance - v_cost
  );
END;
$$;

-- 3. Replace refund_design_tokens with a service_role-only, idempotent version
--    SECURITY DEFINER 유지 사유: design_tokens INSERT는 RLS로 허용되지 않음
--    service_role 전용: 클라이언트가 자신의 토큰을 직접 환불할 수 없도록 차단
DROP FUNCTION IF EXISTS public.refund_design_tokens(uuid, integer, text, text);

CREATE OR REPLACE FUNCTION public.refund_design_tokens(
  p_user_id      uuid,
  p_amount       integer,
  p_ai_model     text,
  p_request_type text,
  p_work_id      text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- service_role 전용: 클라이언트 직접 호출 차단
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: refund requires service_role';
  END IF;

  IF p_amount <= 0 THEN
    RETURN;
  END IF;

  -- work_id 기반 멱등성: 동일 work_id로 이미 환불된 경우 무시
  INSERT INTO public.design_tokens (user_id, amount, type, ai_model, request_type, description, work_id)
  VALUES (
    p_user_id,
    p_amount,
    'refund',
    p_ai_model,
    p_request_type,
    '이미지 생성 실패 환불 (' || p_ai_model || ')',
    p_work_id
  )
  ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
END;
$$;
