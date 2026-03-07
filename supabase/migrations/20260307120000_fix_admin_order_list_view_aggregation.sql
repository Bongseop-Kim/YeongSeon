create or replace view "public"."admin_order_list_view"
with (security_invoker = true)
as
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
  ELSE NULL END AS "reformSummary",
  o.payment_group_id AS "paymentGroupId",
  o.shipping_cost    AS "shippingCost"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN LATERAL (
  SELECT
    (
      SELECT oi2.reform_data
      FROM public.order_items oi2
      WHERE oi2.order_id = o.id AND oi2.item_type = 'reform'
      LIMIT 1
    ) AS reform_data,
    SUM(oi.quantity)::integer AS item_quantity
  FROM public.order_items oi
  WHERE oi.order_id = o.id AND oi.item_type = 'reform'
) ri ON o.order_type IN ('custom', 'repair');
