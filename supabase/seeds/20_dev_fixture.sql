INSERT INTO public.shipping_addresses (
  id,
  user_id,
  recipient_name,
  recipient_phone,
  address,
  address_detail,
  postal_code,
  delivery_request,
  delivery_memo,
  is_default
)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '로컬 스토어',
  '01012345678',
  '서울특별시 강남구 테헤란로 123',
  '101호',
  '06142',
  'DELIVERY_REQUEST_1',
  '문 앞에 놓아주세요',
  true
)
ON CONFLICT (id) DO UPDATE
SET recipient_name = EXCLUDED.recipient_name,
    recipient_phone = EXCLUDED.recipient_phone,
    address = EXCLUDED.address,
    address_detail = EXCLUDED.address_detail,
    postal_code = EXCLUDED.postal_code,
    delivery_request = EXCLUDED.delivery_request,
    delivery_memo = EXCLUDED.delivery_memo,
    is_default = EXCLUDED.is_default;

INSERT INTO public.coupons (
  id,
  name,
  discount_type,
  discount_value,
  max_discount_amount,
  description,
  expiry_date,
  additional_info,
  is_active
)
VALUES (
  '40000000-0000-4000-8000-000000000001',
  '로컬 개발 주문 쿠폰',
  'fixed',
  1000,
  1000,
  '로컬 개발과 E2E 구매 플로우를 위한 쿠폰',
  '2099-12-31',
  'seed',
  true
)
ON CONFLICT (name) DO UPDATE
SET discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    max_discount_amount = EXCLUDED.max_discount_amount,
    description = EXCLUDED.description,
    expiry_date = EXCLUDED.expiry_date,
    additional_info = EXCLUDED.additional_info,
    is_active = EXCLUDED.is_active;

INSERT INTO public.user_coupons (
  id,
  user_id,
  coupon_id,
  status,
  expires_at
)
VALUES (
  '50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'active',
  '2099-12-31T23:59:59Z'
)
ON CONFLICT (user_id, coupon_id) DO UPDATE
SET status = EXCLUDED.status,
    expires_at = EXCLUDED.expires_at,
    used_at = NULL;
