-- =============================================================
-- Migration: Add delivered_at / confirmed_at to order views
-- =============================================================

-- ── order_detail_view (store용) ───────────────────────────────
-- Adds delivered_at for auto-confirmation countdown calculation.
CREATE OR REPLACE VIEW public.order_detail_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.order_number    AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.status,
  o.total_price     AS "totalPrice",
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


-- ── admin_order_list_view ─────────────────────────────────────
-- Adds delivered_at, confirmed_at for admin visibility.
CREATE OR REPLACE VIEW public.admin_order_list_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.user_id        AS "userId",
  o.order_number   AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.order_type     AS "orderType",
  o.status,
  o.total_price    AS "totalPrice",
  o.original_price AS "originalPrice",
  o.total_discount AS "totalDiscount",
  o.courier_company  AS "courierCompany",
  o.tracking_number  AS "trackingNumber",
  o.shipped_at       AS "shippedAt",
  o.delivered_at     AS "deliveredAt",
  o.confirmed_at     AS "confirmedAt",
  o.created_at,
  o.updated_at,
  p.name           AS "customerName",
  p.phone          AS "customerPhone",
  public.admin_get_email(o.user_id) AS "customerEmail",
  CASE WHEN o.order_type = 'custom' THEN ri.reform_data->'options'->>'fabric_type' ELSE NULL END AS "fabricType",
  CASE WHEN o.order_type = 'custom' THEN ri.reform_data->'options'->>'design_type' ELSE NULL END AS "designType",
  CASE WHEN o.order_type IN ('custom', 'repair') THEN ri.item_quantity ELSE NULL END AS "itemQuantity",
  CASE WHEN o.order_type = 'repair' THEN
    ri.item_quantity || '개 넥타이 수선'
  ELSE NULL END AS "reformSummary"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN LATERAL (
  SELECT oi.reform_data, oi.quantity AS item_quantity
  FROM public.order_items oi
  WHERE oi.order_id = o.id AND oi.item_type = 'reform'
  LIMIT 1
) ri ON o.order_type IN ('custom', 'repair');


-- ── admin_order_detail_view ───────────────────────────────────
-- Adds delivered_at, confirmed_at for admin detail view.
CREATE OR REPLACE VIEW public.admin_order_detail_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.user_id        AS "userId",
  o.order_number   AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.order_type     AS "orderType",
  o.status,
  o.total_price    AS "totalPrice",
  o.original_price AS "originalPrice",
  o.total_discount AS "totalDiscount",
  o.courier_company  AS "courierCompany",
  o.tracking_number  AS "trackingNumber",
  o.shipped_at       AS "shippedAt",
  o.delivered_at     AS "deliveredAt",
  o.confirmed_at     AS "confirmedAt",
  o.created_at,
  o.updated_at,
  p.name           AS "customerName",
  p.phone          AS "customerPhone",
  public.admin_get_email(o.user_id) AS "customerEmail",
  sa.recipient_name   AS "recipientName",
  sa.recipient_phone  AS "recipientPhone",
  sa.address          AS "shippingAddress",
  sa.address_detail   AS "shippingAddressDetail",
  sa.postal_code      AS "shippingPostalCode",
  sa.delivery_memo    AS "deliveryMemo",
  sa.delivery_request AS "deliveryRequest"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id;
