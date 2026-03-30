-- fix: 고객 주문 목록에서 표시 가능한 아이템이 없는 주문 제외
--
-- order_item_view가 클레임된 아이템을 숨기므로, 모든 아이템이 클레임 처리된 주문은
-- 고객 주문 목록의 최초 조회 단계에서 제외한다.

CREATE OR REPLACE VIEW public.order_list_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.order_number AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.status,
  o.total_price AS "totalPrice",
  o.order_type AS "orderType",
  o.created_at,
  public.get_order_customer_actions(o.order_type, o.status, o.id) AS "customerActions"
FROM public.orders o
WHERE o.user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.order_items oi
    WHERE oi.order_id = o.id
      AND NOT EXISTS (
        SELECT 1
        FROM public.claims cl
        WHERE cl.order_item_id = oi.id
      )
  );
