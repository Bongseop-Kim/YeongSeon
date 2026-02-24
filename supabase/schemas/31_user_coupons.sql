-- =============================================================
-- 31_user_coupons.sql  –  User coupons
-- =============================================================

CREATE TABLE IF NOT EXISTS public.user_coupons (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  coupon_id  uuid        NOT NULL,
  status     text        NOT NULL DEFAULT 'active',
  issued_at  timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_coupons_pkey PRIMARY KEY (id),
  CONSTRAINT user_coupons_status_check
    CHECK (status = ANY (ARRAY['active','used','expired','revoked'])),
  CONSTRAINT user_coupons_coupon_id_fkey
    FOREIGN KEY (coupon_id) REFERENCES public.coupons (id),
  CONSTRAINT user_coupons_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id)
);

-- Indexes
CREATE INDEX user_coupons_user_id_idx  ON public.user_coupons USING btree (user_id);
CREATE INDEX user_coupons_status_idx   ON public.user_coupons USING btree (status);
CREATE INDEX user_coupons_expires_idx  ON public.user_coupons USING btree (expires_at);
CREATE UNIQUE INDEX user_coupons_user_coupon_uniq ON public.user_coupons (user_id, coupon_id);

-- Trigger
CREATE OR REPLACE TRIGGER user_coupons_set_updated_at
  BEFORE UPDATE ON public.user_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_coupons_select_own"
  ON public.user_coupons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_coupons_service_all"
  ON public.user_coupons
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin policies
CREATE POLICY "Admins can view all user coupons"
  ON public.user_coupons FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert user coupons"
  ON public.user_coupons FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user coupons"
  ON public.user_coupons FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
