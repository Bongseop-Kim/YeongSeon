DELETE FROM public.coupons c
WHERE c.name = 'SAMPLE_DISCOUNT'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_coupons uc WHERE uc.coupon_id = c.id
  );
