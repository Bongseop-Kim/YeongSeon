-- 20260319000000에서 생성된 부분 인덱스(partial index)를 CONSTRAINT로 변환해
-- 20260319153000의 RENAME CONSTRAINT가 동작하도록 한다.
--
-- 원격 DB는 이미 coupons_name_unique로 rename된 상태이므로 IF 조건이 false가 되어
-- 아무것도 실행하지 않는다. (db push 안전)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'coupons_sample_discount_unique'
      AND conrelid = 'public.coupons'::regclass
  ) AND EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'coupons_sample_discount_unique'
      AND tablename = 'coupons' AND schemaname = 'public'
  ) THEN
    DROP INDEX public.coupons_sample_discount_unique;
    ALTER TABLE public.coupons ADD CONSTRAINT coupons_sample_discount_unique UNIQUE (name);
  END IF;
END $$;
