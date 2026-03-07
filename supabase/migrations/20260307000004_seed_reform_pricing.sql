INSERT INTO custom_order_pricing_constants (key, amount) VALUES
  ('REFORM_BASE_COST',     15000),
  ('REFORM_SHIPPING_COST',  3000)
ON CONFLICT (key) DO UPDATE SET amount = EXCLUDED.amount;
