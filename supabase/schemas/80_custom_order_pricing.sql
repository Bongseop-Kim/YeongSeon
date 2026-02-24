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
  AS RESTRICTIVE
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);

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
  AS RESTRICTIVE
  TO service_role, postgres
  USING (true)
  WITH CHECK (true);
