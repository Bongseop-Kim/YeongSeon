-- =============================================================
-- Add 6 sample statuses + sample_cost column + sample pricing constants
-- =============================================================

-- 1) orders_status_check 제약 변경: 6개 샘플 상태 추가
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    '대기중','결제중','진행중','배송중','배송완료','완료','취소','실패',
    '접수','제작중','제작완료',
    '수선중','수선완료',
    '샘플원단제작중','샘플원단배송중','샘플봉제제작중',
    '샘플넥타이배송중','샘플배송완료','샘플승인'
  ]));

-- 2) sample_cost 컬럼 추가 (orders 테이블)
ALTER TABLE public.orders
  ADD COLUMN sample_cost integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_sample_cost_check CHECK (sample_cost >= 0);

-- 3) 샘플 비용 pricing constants seed
INSERT INTO public.custom_order_pricing_constants (key, amount) VALUES
  ('SAMPLE_SEWING_COST', 50000),
  ('SAMPLE_FABRIC_COST', 100000),
  ('SAMPLE_FABRIC_AND_SEWING_COST', 150000)
ON CONFLICT (key) DO NOTHING;
