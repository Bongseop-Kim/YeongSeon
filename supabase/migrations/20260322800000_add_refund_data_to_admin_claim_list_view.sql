-- admin_claim_list_view에 refund_data 컬럼 추가
-- claims.refund_data(jsonb)가 admin DTO에서 이미 매핑되고 있으나
-- 뷰에 포함되지 않아 관리자 앱에서 항상 null로 반환되던 문제 수정

CREATE OR REPLACE VIEW public.admin_claim_list_view
WITH (security_invoker = true)
AS
SELECT
  cl.id,
  cl.user_id      AS "userId",
  cl.claim_number  AS "claimNumber",
  to_char(cl.created_at, 'YYYY-MM-DD') AS date,
  cl.status,
  cl.type,
  cl.reason,
  cl.description,
  cl.quantity      AS "claimQuantity",
  cl.created_at,
  cl.updated_at,
  cl.return_courier_company  AS "returnCourierCompany",
  cl.return_tracking_number  AS "returnTrackingNumber",
  cl.resend_courier_company  AS "resendCourierCompany",
  cl.resend_tracking_number  AS "resendTrackingNumber",
  o.id             AS "orderId",
  o.order_number   AS "orderNumber",
  o.status         AS "orderStatus",
  o.courier_company AS "orderCourierCompany",
  o.tracking_number AS "orderTrackingNumber",
  o.shipped_at     AS "orderShippedAt",
  p.name           AS "customerName",
  p.phone          AS "customerPhone",
  oi.item_type     AS "itemType",
  pr.name          AS "productName",
  cl.refund_data
FROM public.claims cl
JOIN public.orders o ON o.id = cl.order_id
JOIN public.order_items oi ON oi.id = cl.order_item_id
LEFT JOIN public.products pr ON pr.id = oi.product_id
LEFT JOIN public.profiles p ON p.id = cl.user_id;
