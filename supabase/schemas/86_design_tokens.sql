-- =============================================================
-- 86_design_tokens.sql  –  Design AI token ledger
-- =============================================================

CREATE TABLE public.design_tokens (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount          integer     NOT NULL CHECK (amount != 0),
  type            text        NOT NULL CHECK (type = ANY(ARRAY['grant','use','refund','admin','purchase'])),
  token_class     text        NOT NULL CHECK (token_class IN ('paid', 'bonus', 'free')),
  ai_model        text,       -- 'openai' | NULL
  request_type    text        CHECK (
    request_type IS NULL OR
    request_type = ANY(ARRAY['analysis', 'prep', 'render_standard', 'render_high'])
  ),
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  work_id         text,
  source_order_id uuid        REFERENCES public.orders(id) ON DELETE SET NULL,
  expires_at      timestamptz
);

CREATE INDEX idx_design_tokens_user_id ON public.design_tokens (user_id, created_at DESC);
CREATE UNIQUE INDEX idx_design_tokens_work_id ON public.design_tokens (work_id) WHERE work_id IS NOT NULL;
CREATE INDEX idx_design_tokens_user_class ON public.design_tokens (user_id, token_class);
CREATE INDEX idx_design_tokens_source_order_id
  ON public.design_tokens (source_order_id)
  WHERE source_order_id IS NOT NULL;
CREATE INDEX idx_design_tokens_user_paid_expiry
  ON public.design_tokens (user_id, expires_at)
  WHERE token_class = 'paid' AND expires_at IS NOT NULL;

-- RLS: users can only SELECT their own tokens
-- INSERT/UPDATE are controlled exclusively by SECURITY DEFINER RPCs
ALTER TABLE public.design_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own design tokens"
  ON public.design_tokens FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admins can view all design tokens"
  ON public.design_tokens FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── Auto-grant trigger on profile creation ───────────────────
-- SECURITY DEFINER: RLS 우회 필요 (design_tokens INSERT는 RPC 전용)
-- auth.users provider metadata가 있는 실제 Auth 가입 사용자에게만 최초 지급한다.
CREATE OR REPLACE FUNCTION public.grant_initial_design_tokens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_amount integer;
  v_has_auth_provider boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = NEW.id
      AND (
        NULLIF(BTRIM(COALESCE(u.raw_app_meta_data->>'provider', '')), '') IS NOT NULL
        OR (
          jsonb_typeof(u.raw_app_meta_data->'providers') = 'array'
          AND jsonb_array_length(u.raw_app_meta_data->'providers') > 0
        )
      )
  )
  INTO v_has_auth_provider;

  IF NOT v_has_auth_provider THEN
    RETURN NEW;
  END IF;

  SELECT CASE
    WHEN value ~ '^[0-9]+$' AND value::integer >= 1 THEN value::integer
    ELSE 30
  END
  INTO v_amount
  FROM public.admin_settings
  WHERE key = 'design_token_initial_grant';

  IF v_amount IS NULL THEN
    v_amount := 30;
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, token_class, description)
  VALUES (NEW.id, v_amount, 'grant', 'free', '신규 가입 토큰 지급');

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.grant_initial_design_tokens()
  IS 'SECURITY DEFINER is required because design_tokens INSERT is RPC/trigger-only; the function grants initial signup tokens only for auth.users rows with Supabase Auth provider metadata.';

CREATE TRIGGER trg_grant_initial_design_tokens
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_initial_design_tokens();
