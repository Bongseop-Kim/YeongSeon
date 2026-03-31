ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS company_courier_company text,
  ADD COLUMN IF NOT EXISTS company_tracking_number text,
  ADD COLUMN IF NOT EXISTS company_shipped_at timestamptz;

DROP FUNCTION IF EXISTS public.admin_update_order_tracking(uuid, text, text);

CREATE OR REPLACE FUNCTION public.admin_update_order_tracking(
  p_order_id uuid,
  p_courier_company text DEFAULT NULL,
  p_tracking_number text DEFAULT NULL,
  p_company_courier_company text DEFAULT NULL,
  p_company_tracking_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_tracking_number text;
  v_company_tracking_number text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_tracking_number := nullif(trim(p_tracking_number), '');
  v_company_tracking_number := nullif(trim(p_company_tracking_number), '');

  update public.orders
  set
    courier_company = nullif(trim(p_courier_company), ''),
    tracking_number = v_tracking_number,
    shipped_at = case
      when v_tracking_number is not null then coalesce(shipped_at, now())
      else shipped_at
    end,
    company_courier_company = nullif(trim(p_company_courier_company), ''),
    company_tracking_number = v_company_tracking_number,
    company_shipped_at = case
      when v_company_tracking_number is not null
        then coalesce(company_shipped_at, now())
      else company_shipped_at
    end
  where id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$$;

GRANT ALL ON FUNCTION public.admin_update_order_tracking(
  uuid,
  text,
  text,
  text,
  text
) TO anon;
GRANT ALL ON FUNCTION public.admin_update_order_tracking(
  uuid,
  text,
  text,
  text,
  text
) TO authenticated;
GRANT ALL ON FUNCTION public.admin_update_order_tracking(
  uuid,
  text,
  text,
  text,
  text
) TO service_role;

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
  o.courier_company         AS "courierCompany",
  o.tracking_number         AS "trackingNumber",
  o.shipped_at              AS "shippedAt",
  o.delivered_at            AS "deliveredAt",
  o.confirmed_at            AS "confirmedAt",
  o.company_courier_company AS "companyCourierCompany",
  o.company_tracking_number AS "companyTrackingNumber",
  o.company_shipped_at      AS "companyShippedAt",
  o.created_at,
  o.updated_at,
  p.name           AS "customerName",
  p.phone          AS "customerPhone",
  public.admin_get_email(o.user_id) AS "customerEmail",
  CASE WHEN o.order_type = 'custom' THEN ri.item_data->'options'->>'fabric_type' ELSE NULL END AS "fabricType",
  CASE WHEN o.order_type = 'custom' THEN ri.item_data->'options'->>'design_type' ELSE NULL END AS "designType",
  CASE WHEN o.order_type IN ('custom', 'repair', 'sample') THEN ri.item_quantity ELSE NULL END AS "itemQuantity",
  CASE WHEN o.order_type = 'repair' THEN
    ri.item_quantity || '개 넥타이 수선'
  ELSE NULL END AS "reformSummary",
  o.payment_group_id AS "paymentGroupId",
  o.shipping_cost    AS "shippingCost",
  CASE WHEN o.order_type = 'sample' THEN true ELSE NULL END AS "isSample",
  CASE WHEN o.order_type = 'sample'
    THEN ri.item_data->>'sample_type'
    ELSE NULL
  END AS "sampleType"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN LATERAL (
  SELECT
    (
      SELECT oi2.item_data
      FROM public.order_items oi2
      WHERE oi2.order_id = o.id AND oi2.item_type IN ('reform', 'custom', 'sample')
      LIMIT 1
    ) AS item_data,
    SUM(oi.quantity)::integer AS item_quantity
  FROM public.order_items oi
  WHERE oi.order_id = o.id AND oi.item_type IN ('reform', 'custom', 'sample')
) ri ON o.order_type IN ('custom', 'repair', 'sample')
WHERE NOT EXISTS (
  SELECT 1 FROM public.claims c
  WHERE c.order_id = o.id
    AND c.type = 'cancel'
    AND c.status IN ('접수', '처리중')
);

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
  o.courier_company         AS "courierCompany",
  o.tracking_number         AS "trackingNumber",
  o.shipped_at              AS "shippedAt",
  o.delivered_at            AS "deliveredAt",
  o.confirmed_at            AS "confirmedAt",
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
  o.payment_group_id  AS "paymentGroupId",
  o.shipping_cost     AS "shippingCost",
  public.get_order_admin_actions(o.order_type, o.status) AS "adminActions"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id
LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id;
