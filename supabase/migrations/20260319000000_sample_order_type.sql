ALTER TABLE public.orders DROP CONSTRAINT orders_order_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check
  CHECK (order_type = ANY (ARRAY['sale','custom','repair','token','sample']));

ALTER TABLE public.order_items DROP CONSTRAINT order_items_item_type_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_item_type_check
  CHECK (item_type = ANY (ARRAY['product','reform','custom','token','sample']));

ALTER TABLE public.order_items DROP CONSTRAINT order_items_item_type_content_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_item_type_content_check
  CHECK (
    (item_type = 'product' AND product_id IS NOT NULL)
    OR (item_type = 'reform' AND item_data IS NOT NULL)
    OR (item_type = 'custom' AND item_data IS NOT NULL)
    OR (item_type = 'token' AND item_data IS NOT NULL)
    OR (item_type = 'sample' AND item_data IS NOT NULL)
  );

INSERT INTO public.pricing_constants (key, amount, category)
VALUES ('SAMPLE_FIXED_COST', 100000, 'custom_order')
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
VALUES (
  'SAMPLE_DISCOUNT',
  'fixed',
  100000,
  100000,
  '2099-12-31',
  true
)
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX coupons_sample_discount_unique
  ON public.coupons (name) WHERE name = 'SAMPLE_DISCOUNT';
