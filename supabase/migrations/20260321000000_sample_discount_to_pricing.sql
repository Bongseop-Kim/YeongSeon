-- 샘플 할인값을 pricing_constants로 이관
-- ⚠️ 기존 SAMPLE_DISCOUNT_* 쿠폰 row는 FK 제약으로 삭제하지 않음.
--    이 마이그레이션 이후 coupons row는 confirm_payment_orders RPC가 자동 동기화.

-- 1) coupons.name unique 제약 추가 (SAMPLE_DISCOUNT_* UPSERT용)
-- 이미 존재하는 경우 skip (이전에 직접 추가된 케이스 대응)
DO $$ BEGIN
  ALTER TABLE public.coupons
    ADD CONSTRAINT coupons_sample_discount_unique UNIQUE (name);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- 2) category 제약 확장
ALTER TABLE public.pricing_constants
  DROP CONSTRAINT pricing_constants_category_check;
ALTER TABLE public.pricing_constants
  ADD CONSTRAINT pricing_constants_category_check
    CHECK (category IN ('custom_order', 'fabric', 'reform', 'token', 'sample_discount'));

-- 3) 샘플 할인값 5종 INSERT (기존 쿠폰의 discount_value 값 그대로)
INSERT INTO public.pricing_constants (key, amount, category)
VALUES
  ('sample_discount_sewing',                      100000, 'sample_discount'),
  ('sample_discount_fabric_printing',             100000, 'sample_discount'),
  ('sample_discount_fabric_yarn_dyed',            100000, 'sample_discount'),
  ('sample_discount_fabric_and_sewing_printing',  200000, 'sample_discount'),
  ('sample_discount_fabric_and_sewing_yarn_dyed', 200000, 'sample_discount')
ON CONFLICT (key) DO UPDATE SET amount = EXCLUDED.amount;
