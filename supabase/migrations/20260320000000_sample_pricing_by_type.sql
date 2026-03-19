-- Sample order pricing split by type and design type.

INSERT INTO public.pricing_constants (key, amount, category)
VALUES
  ('SAMPLE_SEWING_COST',                        100000, 'custom_order'),
  ('SAMPLE_FABRIC_PRINTING_COST',               100000, 'custom_order'),
  ('SAMPLE_FABRIC_YARN_DYED_COST',              100000, 'custom_order'),
  ('SAMPLE_FABRIC_AND_SEWING_PRINTING_COST',    200000, 'custom_order'),
  ('SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST',   200000, 'custom_order')
ON CONFLICT (key) DO UPDATE SET amount = EXCLUDED.amount;

DELETE FROM public.pricing_constants WHERE key = 'SAMPLE_FIXED_COST';

-- 기존 단일 샘플 할인 쿠폰 비활성화
UPDATE public.coupons SET is_active = false WHERE name = 'SAMPLE_DISCOUNT';

-- 샘플 타입별 5종 쿠폰 생성
INSERT INTO public.coupons (name, discount_type, discount_value, max_discount_amount, expiry_date, is_active)
VALUES
  ('SAMPLE_DISCOUNT_SEWING',                      'fixed', 100000, 100000, '2099-12-31', true),
  ('SAMPLE_DISCOUNT_FABRIC_PRINTING',             'fixed', 100000, 100000, '2099-12-31', true),
  ('SAMPLE_DISCOUNT_FABRIC_YARN_DYED',            'fixed', 100000, 100000, '2099-12-31', true),
  ('SAMPLE_DISCOUNT_FABRIC_AND_SEWING_PRINTING',  'fixed', 200000, 200000, '2099-12-31', true),
  ('SAMPLE_DISCOUNT_FABRIC_AND_SEWING_YARN_DYED', 'fixed', 200000, 200000, '2099-12-31', true)
ON CONFLICT DO NOTHING;
