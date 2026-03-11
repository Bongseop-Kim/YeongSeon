-- order_list_view / order_detail_view에 order_type 컬럼 추가
-- CREATE OR REPLACE VIEW는 기존 컬럼 순서 변경 불가 → DROP + CREATE 사용

-- 1. order_list_view
DROP VIEW IF EXISTS public.order_list_view;
CREATE VIEW public.order_list_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.order_number  AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.status,
  o.total_price   AS "totalPrice",
  o.order_type    AS "orderType",
  o.created_at
FROM public.orders o
WHERE o.user_id = auth.uid();

-- 2. order_detail_view
DROP VIEW IF EXISTS public.order_detail_view;
CREATE VIEW public.order_detail_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.order_number    AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.status,
  o.total_price     AS "totalPrice",
  o.order_type      AS "orderType",
  o.courier_company AS "courierCompany",
  o.tracking_number AS "trackingNumber",
  o.shipped_at      AS "shippedAt",
  o.delivered_at    AS "deliveredAt",
  o.confirmed_at    AS "confirmedAt",
  o.created_at,
  sa.recipient_name   AS "recipientName",
  sa.recipient_phone  AS "recipientPhone",
  sa.address          AS "shippingAddress",
  sa.address_detail   AS "shippingAddressDetail",
  sa.postal_code      AS "shippingPostalCode",
  sa.delivery_memo    AS "deliveryMemo",
  sa.delivery_request AS "deliveryRequest"
FROM public.orders o
LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id
WHERE o.user_id = auth.uid();
