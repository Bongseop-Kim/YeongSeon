-- Design token: high quality 차등 과금 및 유효기간(expires_at) 추가

-- 1. expires_at 컬럼 추가
ALTER TABLE public.design_tokens
  ADD COLUMN expires_at timestamptz;

-- 2. 초기 지급 트리거: 무료 토큰 90일 유효기간 설정
CREATE OR REPLACE FUNCTION public.grant_initial_design_tokens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_amount integer;
BEGIN
  SELECT COALESCE(value::integer, 30)
    INTO v_amount
    FROM public.admin_settings
   WHERE key = 'design_token_initial_grant';

  IF v_amount IS NULL THEN
    v_amount := 30;
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, description, expires_at)
  VALUES (NEW.id, v_amount, 'grant', '신규 가입 토큰 지급', now() + interval '90 days');

  RETURN NEW;
END;
$$;

-- 3. get_design_token_balance: 만료 토큰 제외
CREATE OR REPLACE FUNCTION public.get_design_token_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.design_tokens
  WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now());
$$;

-- 4. use_design_tokens: p_quality 파라미터 추가, 만료 토큰 제외
CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id     uuid,
  p_ai_model    text,             -- 'openai' | 'gemini'
  p_request_type text,            -- 'text_only' | 'text_and_image'
  p_quality      text DEFAULT 'standard'  -- 'high' | 'standard'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cost_key   text;
  v_cost       integer;
  v_balance    integer;
BEGIN
  -- 동시 요청에 대한 advisory lock (사용자별)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- admin_settings에서 비용 조회 (openai high quality 이미지는 별도 키 사용)
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

  SELECT COALESCE(value::integer, 1)
    INTO v_cost
    FROM public.admin_settings
   WHERE key = v_cost_key;

  IF v_cost IS NULL THEN
    v_cost := 1;
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

-- 5. admin_settings 시드: openai high quality 이미지 비용 추가
INSERT INTO public.admin_settings (key, value)
VALUES ('design_token_cost_openai_image_high', '12')
ON CONFLICT (key) DO NOTHING;
