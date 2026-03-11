-- =============================================================
-- 80_custom_order_pricing.sql  –  Unified pricing constants table
-- =============================================================

-- Single unified pricing table for all pricing data
-- categories: custom_order, fabric, reform, token
CREATE TABLE IF NOT EXISTS public.pricing_constants (
  key        text        NOT NULL,
  amount     integer     NOT NULL,
  category   text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid        REFERENCES auth.users(id),

  CONSTRAINT pricing_constants_pkey PRIMARY KEY (key),
  CONSTRAINT pricing_constants_amount_check CHECK (amount >= 0),
  CONSTRAINT pricing_constants_category_check
    CHECK (category IN ('custom_order', 'fabric', 'reform', 'token'))
);

ALTER TABLE public.pricing_constants ENABLE ROW LEVEL SECURITY;

-- 가격 정보는 비민감 공개 데이터이므로 anon read 허용
CREATE POLICY "allow_public_read_pricing_constants"
  ON public.pricing_constants
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "admin_update_pricing_constants"
  ON public.pricing_constants FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "pricing_constants_service_role_only"
  ON public.pricing_constants
  AS PERMISSIVE
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER set_pricing_constants_updated_at
  BEFORE UPDATE ON public.pricing_constants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
