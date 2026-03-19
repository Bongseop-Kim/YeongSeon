-- Align sample pricing seeds with the current sample domain specification.

UPDATE public.coupons
SET is_active = false
WHERE name = 'SAMPLE_DISCOUNT';

INSERT INTO public.pricing_constants (key, amount, category)
VALUES
  ('SAMPLE_SEWING_COST',                        100000, 'custom_order'),
  ('SAMPLE_FABRIC_PRINTING_COST',               100000, 'custom_order'),
  ('SAMPLE_FABRIC_YARN_DYED_COST',              100000, 'custom_order'),
  ('SAMPLE_FABRIC_AND_SEWING_PRINTING_COST',    200000, 'custom_order'),
  ('SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST',   200000, 'custom_order')
ON CONFLICT (key) DO UPDATE
SET amount = EXCLUDED.amount,
    category = EXCLUDED.category;

INSERT INTO public.pricing_constants (key, amount, category)
VALUES
  ('sample_discount_sewing',                      100000, 'sample_discount'),
  ('sample_discount_fabric_printing',             100000, 'sample_discount'),
  ('sample_discount_fabric_yarn_dyed',            100000, 'sample_discount'),
  ('sample_discount_fabric_and_sewing_printing',  200000, 'sample_discount'),
  ('sample_discount_fabric_and_sewing_yarn_dyed', 200000, 'sample_discount')
ON CONFLICT (key) DO UPDATE
SET amount = EXCLUDED.amount,
    category = EXCLUDED.category;

INSERT INTO public.coupons (
  name,
  discount_type,
  discount_value,
  max_discount_amount,
  expiry_date,
  is_active
)
VALUES
  ('SAMPLE_DISCOUNT_SEWING',                      'fixed', 100000, 100000, '2099-12-31', true),
  ('SAMPLE_DISCOUNT_FABRIC_PRINTING',             'fixed', 100000, 100000, '2099-12-31', true),
  ('SAMPLE_DISCOUNT_FABRIC_YARN_DYED',            'fixed', 100000, 100000, '2099-12-31', true),
  ('SAMPLE_DISCOUNT_FABRIC_AND_SEWING_PRINTING',  'fixed', 200000, 200000, '2099-12-31', true),
  ('SAMPLE_DISCOUNT_FABRIC_AND_SEWING_YARN_DYED', 'fixed', 200000, 200000, '2099-12-31', true)
ON CONFLICT (name) DO UPDATE
SET discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    max_discount_amount = EXCLUDED.max_discount_amount,
    expiry_date = EXCLUDED.expiry_date,
    is_active = EXCLUDED.is_active;
