-- =============================================================
-- 30_coupons.sql  –  Coupons
-- =============================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id                  uuid          NOT NULL DEFAULT extensions.uuid_generate_v4(),
  name                text          NOT NULL,
  discount_type       text          NOT NULL,
  discount_value      numeric(10,2) NOT NULL,
  max_discount_amount numeric(10,2),
  description         text,
  expiry_date         date          NOT NULL,
  additional_info     text,
  is_active           boolean       NOT NULL DEFAULT true,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT coupons_pkey PRIMARY KEY (id),
  CONSTRAINT coupons_discount_type_check
    CHECK (discount_type = ANY (ARRAY['percentage','fixed'])),
  CONSTRAINT coupons_discount_value_check
    CHECK (discount_value > 0)
);

-- Indexes
CREATE INDEX coupons_active_idx ON public.coupons USING btree (is_active);
CREATE INDEX coupons_expiry_idx ON public.coupons USING btree (expiry_date);

-- Trigger
CREATE OR REPLACE TRIGGER coupons_set_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to coupons"
  ON public.coupons FOR SELECT
  USING (true);

CREATE POLICY "Allow service role full access to coupons"
  ON public.coupons
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
