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
  o.company_courier_company AS "companyCourierCompany",
  o.company_tracking_number AS "companyTrackingNumber",
  o.company_shipped_at      AS "companyShippedAt",
  o.confirmed_at    AS "confirmedAt",
  o.created_at,
  sa.recipient_name   AS "recipientName",
  sa.recipient_phone  AS "recipientPhone",
  sa.address          AS "shippingAddress",
  sa.address_detail   AS "shippingAddressDetail",
  sa.postal_code      AS "shippingPostalCode",
  sa.delivery_memo    AS "deliveryMemo",
  sa.delivery_request AS "deliveryRequest",
  public.get_order_customer_actions(o.order_type, o.status, o.id) AS "customerActions"
FROM public.orders o
LEFT JOIN public.shipping_addresses sa ON sa.id = o.shipping_address_id
WHERE o.user_id = auth.uid();

DROP VIEW IF EXISTS public.admin_order_list_view;
CREATE VIEW public.admin_order_list_view
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
) ri ON o.order_type IN ('custom', 'repair', 'sample');

CREATE OR REPLACE FUNCTION public.auto_confirm_delivered_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order  record;
  v_count  integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') not in ('', 'service_role') then
    raise exception 'unauthorized: scheduler-only function';
  end if;

  for v_order in
    select id, user_id, total_price, status
    from public.orders
    where (
      (status = '배송완료' and delivered_at <= now() - interval '7 days')
      or
      (
        status = '배송중'
        and (
          (order_type = 'repair' and company_shipped_at <= now() - interval '7 days')
          or
          (order_type <> 'repair' and shipped_at <= now() - interval '7 days')
        )
      )
    )
    and not exists (
      select 1
      from public.claims c
      join public.order_items oi on oi.id = c.order_item_id
      where oi.order_id = orders.id
        and c.status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
    )
    for update skip locked
  loop
    update public.orders
    set status       = '완료',
        confirmed_at = now()
    where id = v_order.id;

    insert into public.order_status_logs (
      order_id,
      changed_by,
      previous_status,
      new_status,
      memo
    )
    values (
      v_order.id,
      NULL,
      v_order.status,
      '완료',
      format('자동 구매확정 (%s 후 7일 경과)', v_order.status)
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'confirmed_count', v_count
  );
end;
$$;

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
  v_order_status text;
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
    courier_company = case
      when p_courier_company is not null
        then nullif(trim(p_courier_company), '')
      else courier_company
    end,
    tracking_number = case
      when p_tracking_number is not null
        then v_tracking_number
      else tracking_number
    end,
    shipped_at = case
      when p_tracking_number is not null and v_tracking_number is not null
        then coalesce(shipped_at, now())
      when p_tracking_number is not null and v_tracking_number is null
        then null
      else shipped_at
    end,
    company_courier_company = case
      when p_company_courier_company is not null
        then nullif(trim(p_company_courier_company), '')
      else company_courier_company
    end,
    company_tracking_number = case
      when p_company_tracking_number is not null
        then v_company_tracking_number
      else company_tracking_number
    end,
    company_shipped_at = case
      when p_company_tracking_number is not null
        and v_company_tracking_number is not null
        then coalesce(company_shipped_at, now())
      when p_company_tracking_number is not null
        and v_company_tracking_number is null
        then null
      else company_shipped_at
    end
  where id = p_order_id
    and status not in ('배송완료', '완료', '취소')
  returning status into v_order_status;

  if not found then
    select status
    into v_order_status
    from public.orders
    where id = p_order_id;

    if not found then
      raise exception 'Order not found';
    end if;

    raise exception 'Tracking cannot be updated for order status: %', v_order_status;
  end if;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$$;
