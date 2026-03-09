-- =============================================================
-- 86_design_tokens.sql  –  Design AI token ledger
-- =============================================================

CREATE TABLE public.design_tokens (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        integer     NOT NULL CHECK (amount != 0),
  type          text        NOT NULL CHECK (type = ANY(ARRAY['grant','use','refund','admin'])),
  ai_model      text,       -- 'openai' | 'gemini' | NULL
  request_type  text,       -- 'text_only' | 'text_and_image' | NULL
  description   text,
  expires_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  work_id       text
);

CREATE INDEX idx_design_tokens_user_id ON public.design_tokens (user_id, created_at DESC);
CREATE UNIQUE INDEX idx_design_tokens_work_id ON public.design_tokens (work_id) WHERE work_id IS NOT NULL;

-- RLS: users can only SELECT their own tokens
-- INSERT/UPDATE are controlled exclusively by SECURITY DEFINER RPCs
ALTER TABLE public.design_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own design tokens"
  ON public.design_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all design tokens"
  ON public.design_tokens FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── Auto-grant trigger on profile creation ───────────────────
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
  -- COALESCE 외부 래핑: 행이 없을 때(no row)와 값이 NULL일 때 모두 30으로 처리
  v_amount := COALESCE(
    (SELECT value::integer FROM public.admin_settings WHERE key = 'design_token_initial_grant'),
    30
  );

  INSERT INTO public.design_tokens (user_id, amount, type, description, expires_at)
  VALUES (NEW.id, v_amount, 'grant', '신규 가입 토큰 지급', now() + interval '90 days');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grant_initial_design_tokens
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_initial_design_tokens();
