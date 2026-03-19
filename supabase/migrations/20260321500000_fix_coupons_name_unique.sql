-- 20260319000000_sample_order_type.sql에서 생성된 부분 인덱스(partial index)를
-- 전체 UNIQUE 제약으로 교체한다.
--
-- 부분 인덱스(WHERE name = 'SAMPLE_DISCOUNT')는 ON CONFLICT (name) 없이 WHERE 절을
-- 요구하므로, 20260322000000_sample_pricing_alignment.sql의 coupons INSERT가 실패한다.
-- 전체 UNIQUE 제약으로 교체해야 ON CONFLICT (name) 이 동작한다.

-- 1) 제약이 존재하면 제거 (20260321000000에서 추가됐을 수 있음)
DO $$ BEGIN
  ALTER TABLE public.coupons DROP CONSTRAINT coupons_sample_discount_unique;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 2) 부분 인덱스가 남아 있으면 제거
DROP INDEX IF EXISTS coupons_sample_discount_unique;

-- 3) 전체 UNIQUE 제약 추가
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_sample_discount_unique UNIQUE (name);
