-- Design token ledger + RPC functions
-- Auto-generated from schemas/86_design_tokens.sql + schemas/99_functions_design_tokens.sql

CREATE TABLE public.design_tokens (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        integer     NOT NULL CHECK (amount != 0),
  type          text        NOT NULL CHECK (type = ANY(ARRAY['grant','use','refund','admin'])),
  ai_model      text,
  request_type  text,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_tokens_user_id ON public.design_tokens (user_id, created_at DESC);

ALTER TABLE public.design_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own design tokens"
  ON public.design_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all design tokens"
  ON public.design_tokens FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Auto-grant trigger on profile creation
-- SECURITY DEFINER: RLS 우회 필요 (design_tokens INSERT는 RPC 전용)
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

  INSERT INTO public.design_tokens (user_id, amount, type, description)
  VALUES (NEW.id, v_amount, 'grant', '신규 가입 토큰 지급');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grant_initial_design_tokens
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_initial_design_tokens();

-- RPC: get_design_token_balance
CREATE OR REPLACE FUNCTION public.get_design_token_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.design_tokens
  WHERE user_id = auth.uid();
$$;

-- RPC: use_design_tokens (service_role 전용)
CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id     uuid,
  p_ai_model    text,
  p_request_type text
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
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_cost_key := 'design_token_cost_' || p_ai_model || '_' ||
    CASE p_request_type
      WHEN 'text_and_image' THEN 'image'
      ELSE 'text'
    END;

  SELECT COALESCE(value::integer, 1)
    INTO v_cost
    FROM public.admin_settings
   WHERE key = v_cost_key;

  IF v_cost IS NULL THEN
    v_cost := 1;
  END IF;

  SELECT COALESCE(SUM(amount), 0)::integer
    INTO v_balance
    FROM public.design_tokens
   WHERE user_id = p_user_id;

  IF v_balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'balance', v_balance,
      'cost', v_cost
    );
  END IF;

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

-- RPC: refund_design_tokens (service_role 전용)
CREATE OR REPLACE FUNCTION public.refund_design_tokens(
  p_user_id     uuid,
  p_amount      integer,
  p_ai_model    text,
  p_request_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, ai_model, request_type, description)
  VALUES (
    p_user_id,
    p_amount,
    'refund',
    p_ai_model,
    p_request_type,
    '이미지 생성 실패 환불 (' || p_ai_model || ')'
  );
END;
$$;

-- admin_settings 시드: 토큰 비용 설정
INSERT INTO public.admin_settings (key, value)
VALUES
  ('design_token_cost_openai_text',  '1'),
  ('design_token_cost_openai_image', '5'),
  ('design_token_cost_gemini_text',  '1'),
  ('design_token_cost_gemini_image', '3'),
  ('design_token_initial_grant',     '30')
ON CONFLICT (key) DO NOTHING;
