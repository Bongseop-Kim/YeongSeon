-- 1마당 수량 상수 추가
INSERT INTO custom_order_pricing_constants (key, amount) VALUES
  ('FABRIC_QTY_ADULT',      4),
  ('FABRIC_QTY_ADULT_FOLD7', 1),
  ('FABRIC_QTY_CHILD',      6)
ON CONFLICT (key) DO UPDATE SET amount = EXCLUDED.amount;
