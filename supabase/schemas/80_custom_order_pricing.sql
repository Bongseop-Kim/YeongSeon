-- =============================================================
-- 80_custom_order_pricing.sql  –  Custom order pricing tables
-- =============================================================

-- Pricing constants (key-value)
CREATE TABLE IF NOT EXISTS public.custom_order_pricing_constants (
  key        text        NOT NULL,
  amount     integer     NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT custom_order_pricing_constants_pkey PRIMARY KEY (key),
  CONSTRAINT custom_order_pricing_constants_amount_check CHECK (amount >= 0)
);

ALTER TABLE public.custom_order_pricing_constants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_order_pricing_constants_service_role_only"
  ON public.custom_order_pricing_constants
  AS PERMISSIVE
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

-- 가격 정보는 비민감 공개 데이터이므로 anon read 허용
CREATE POLICY "allow_public_read_pricing_constants"
  ON public.custom_order_pricing_constants
  FOR SELECT TO anon, authenticated
  USING (true);

-- Fabric prices (design_type × fabric_type matrix)
CREATE TABLE IF NOT EXISTS public.custom_order_fabric_prices (
  design_type text        NOT NULL,
  fabric_type text        NOT NULL,
  unit_price  integer     NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT custom_order_fabric_prices_pkey PRIMARY KEY (design_type, fabric_type),
  CONSTRAINT custom_order_fabric_prices_design_type_check
    CHECK (design_type = ANY (ARRAY['YARN_DYED','PRINTING'])),
  CONSTRAINT custom_order_fabric_prices_fabric_type_check
    CHECK (fabric_type = ANY (ARRAY['SILK','POLY'])),
  CONSTRAINT custom_order_fabric_prices_unit_price_check
    CHECK (unit_price >= 0)
);

ALTER TABLE public.custom_order_fabric_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_order_fabric_prices_service_role_only"
  ON public.custom_order_fabric_prices
  AS PERMISSIVE
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

-- 가격 정보는 비민감 공개 데이터이므로 anon read 허용
CREATE POLICY "allow_public_read_fabric_prices"
  ON public.custom_order_fabric_prices
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "admin_update_pricing_constants"
  ON custom_order_pricing_constants FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_fabric_prices"
  ON custom_order_fabric_prices FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
