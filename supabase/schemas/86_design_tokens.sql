-- =============================================================
-- 86_design_tokens.sql  –  Design AI token ledger
-- =============================================================

CREATE TABLE public.design_tokens (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        integer     NOT NULL CHECK (amount != 0),
  type          text        NOT NULL CHECK (type = ANY(ARRAY['grant','use','refund','admin','purchase'])),
  token_class   text        NOT NULL DEFAULT 'paid' CHECK (token_class IN ('paid', 'bonus', 'free')),
  ai_model      text,       -- 'openai' | 'gemini' | NULL
  request_type  text,       -- 'text_only' | 'text_and_image' | NULL
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  work_id       text
);

CREATE INDEX idx_design_tokens_user_id ON public.design_tokens (user_id, created_at DESC);
CREATE UNIQUE INDEX idx_design_tokens_work_id ON public.design_tokens (work_id) WHERE work_id IS NOT NULL;
CREATE INDEX idx_design_tokens_user_class ON public.design_tokens (user_id, token_class);

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

CREATE TRIGGER trg_grant_initial_design_tokens
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_initial_design_tokens();

-- ── token_refund_requests ────────────────────────────────────
-- 토큰 환불 요청 원장
-- INSERT/UPDATE는 SECURITY DEFINER RPC 전용
CREATE TABLE public.token_refund_requests (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id           uuid        NOT NULL REFERENCES public.orders(id),
  paid_token_amount  integer     NOT NULL CHECK (paid_token_amount > 0),
  bonus_token_amount integer     NOT NULL DEFAULT 0 CHECK (bonus_token_amount >= 0),
  refund_amount      integer     NOT NULL CHECK (refund_amount > 0),
  status             text        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason             text,
  admin_memo         text,
  processed_by       uuid        REFERENCES auth.users(id),
  processed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 동일 주문에 pending 중복 방지
CREATE UNIQUE INDEX idx_token_refund_pending_order
  ON public.token_refund_requests (order_id) WHERE status = 'pending';
CREATE INDEX idx_token_refund_user
  ON public.token_refund_requests (user_id, created_at DESC);
CREATE INDEX idx_token_refund_status
  ON public.token_refund_requests (status) WHERE status = 'pending';

ALTER TABLE public.token_refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own refund requests"
  ON public.token_refund_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all refund requests"
  ON public.token_refund_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());
