DROP VIEW IF EXISTS public.admin_order_detail_view;

CREATE VIEW public.admin_order_detail_view
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
  o.company_courier_company AS "companyCourierCompany",
  o.company_tracking_number AS "companyTrackingNumber",
  o.company_shipped_at      AS "companyShippedAt",
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
  sa.delivery_request AS "deliveryRequest",
  ac.id               AS "activeClaimId",
  ac.claim_number     AS "activeClaimNumber",
  ac.type             AS "activeClaimType",
  ac.status           AS "activeClaimStatus",
  ac.quantity         AS "activeClaimQuantity",
  o.payment_group_id  AS "paymentGroupId",
  o.shipping_cost     AS "shippingCost",
  public.get_order_admin_actions(o.order_type, o.status) AS "adminActions"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id
LEFT JOIN LATERAL (
  SELECT
    cl.id,
    cl.claim_number,
    cl.type,
    cl.status,
    cl.quantity
  FROM public.claims cl
  WHERE cl.order_id = o.id
    AND cl.status IN ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ORDER BY cl.created_at DESC, cl.id DESC
  LIMIT 1
) ac ON true;
