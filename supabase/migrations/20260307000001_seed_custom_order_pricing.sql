-- seed custom_order_pricing_constants
INSERT INTO custom_order_pricing_constants (key, amount) VALUES
  ('START_COST',             100000),
  ('SEWING_PER_COST',          5000),
  ('AUTO_TIE_COST',            1000),
  ('TRIANGLE_STITCH_COST',     1000),
  ('SIDE_STITCH_COST',         1000),
  ('BAR_TACK_COST',            1000),
  ('DIMPLE_COST',              7000),
  ('SPODERATO_COST',          25000),
  ('FOLD7_COST',              55000),
  ('WOOL_INTERLINING_COST',     500),
  ('BRAND_LABEL_COST',          300),
  ('CARE_LABEL_COST',           300),
  ('YARN_DYED_DESIGN_COST',  100000)
ON CONFLICT (key) DO UPDATE SET amount = EXCLUDED.amount;

-- seed custom_order_fabric_prices
INSERT INTO custom_order_fabric_prices (design_type, fabric_type, unit_price) VALUES
  ('YARN_DYED', 'SILK', 25000),
  ('YARN_DYED', 'POLY', 20000),
  ('PRINTING',  'SILK', 20000),
  ('PRINTING',  'POLY',  8000)
ON CONFLICT (design_type, fabric_type) DO UPDATE SET unit_price = EXCLUDED.unit_price;

-- anon/authenticated read RLS for custom_order_pricing_constants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'custom_order_pricing_constants'
      AND policyname = 'allow_public_read_pricing_constants'
  ) THEN
    CREATE POLICY allow_public_read_pricing_constants
      ON custom_order_pricing_constants
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- anon/authenticated read RLS for custom_order_fabric_prices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'custom_order_fabric_prices'
      AND policyname = 'allow_public_read_fabric_prices'
  ) THEN
    CREATE POLICY allow_public_read_fabric_prices
      ON custom_order_fabric_prices
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;
