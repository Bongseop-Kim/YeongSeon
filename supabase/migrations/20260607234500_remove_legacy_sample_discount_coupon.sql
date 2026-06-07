-- 20260319000000_sample_order_type.sql에서 생성되고
-- 20260320000000_sample_pricing_by_type.sql에서 비활성화된
-- 레거시 통합 샘플 할인 쿠폰(SAMPLE_DISCOUNT)을 제거한다.
-- 유형별 쿠폰(SAMPLE_DISCOUNT_*) 5종으로 대체되어 더 이상 사용되지 않는다.
-- 발급 이력(user_coupons)이 있으면 FK 위반을 피하기 위해 삭제하지 않고 남긴다.
DELETE FROM public.coupons c
WHERE c.name = 'SAMPLE_DISCOUNT'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_coupons uc WHERE uc.coupon_id = c.id
  );
