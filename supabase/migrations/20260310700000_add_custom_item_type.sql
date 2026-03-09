-- =============================================================
-- 20260310700000_add_custom_item_type.sql
-- order_items.item_type에 'custom' 추가
-- 기존 custom order 데이터 마이그레이션
-- 관련 뷰/RPC 재생성
-- =============================================================

-- ── 1. CHECK 제약 조건 변경 ────────────────────────────────────

ALTER TABLE public.order_items
  DROP CONSTRAINT order_items_item_type_check,
  ADD CONSTRAINT order_items_item_type_check
    CHECK (item_type = ANY (ARRAY['product','reform','custom']));

ALTER TABLE public.order_items
  DROP CONSTRAINT order_items_item_type_content_check,
  ADD CONSTRAINT order_items_item_type_content_check
    CHECK (
      (item_type = 'product' AND product_id IS NOT NULL)
      OR
      (item_type = 'reform' AND reform_data IS NOT NULL)
      OR
      (item_type = 'custom' AND reform_data IS NOT NULL)
    );

-- ── 2. 기존 custom order 데이터 마이그레이션 ─────────────────────

UPDATE public.order_items oi
  SET item_type = 'custom'
FROM public.orders o
WHERE oi.order_id = o.id
  AND o.order_type = 'custom'
  AND oi.item_type = 'reform';

-- ── 3. 뷰 재생성 ──────────────────────────────────────────────

-- order_item_view: custom 타입도 reformData 반환
CREATE OR REPLACE VIEW public.order_item_view
WITH (security_invoker = true)
AS
SELECT
  oi.order_id,
  oi.created_at,
  oi.item_id AS id,
  oi.item_type AS type,
  CASE
    WHEN oi.item_type = 'product' THEN to_jsonb(p)
    ELSE null
  END AS product,
  CASE
    WHEN oi.item_type = 'product' AND oi.selected_option_id IS NOT NULL THEN (
      SELECT option
      FROM jsonb_array_elements(coalesce(to_jsonb(p)->'options', '[]'::jsonb)) option
      WHERE option->>'id' = oi.selected_option_id
      LIMIT 1
    )
    ELSE null
  END AS "selectedOption",
  oi.quantity,
  CASE
    WHEN oi.item_type IN ('reform', 'custom') THEN oi.reform_data
    ELSE null
  END AS "reformData",
  uc.user_coupon AS "appliedCoupon"
FROM public.order_items oi
JOIN public.orders o
  ON o.id = oi.order_id AND o.user_id = auth.uid()
LEFT JOIN LATERAL (
  SELECT
    plv.id, plv.code, plv.name, plv.price, plv.image,
    plv."detailImages", plv.category, plv.color, plv.pattern,
    plv.material, plv.info, plv.created_at, plv.updated_at,
    plv.options, plv.likes, plv."isLiked"
  FROM public.product_list_view plv
  WHERE oi.item_type = 'product'
    AND oi.product_id IS NOT NULL
    AND plv.id = oi.product_id
  LIMIT 1
) p ON true
LEFT JOIN LATERAL (
  SELECT
    uc1.id,
    jsonb_build_object(
      'id', uc1.id,
      'userId', uc1.user_id,
      'couponId', uc1.coupon_id,
      'status', uc1.status,
      'issuedAt', uc1.issued_at,
      'expiresAt', uc1.expires_at,
      'usedAt', uc1.used_at,
      'coupon', jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'discountType', c.discount_type,
        'discountValue', c.discount_value,
        'maxDiscountAmount', c.max_discount_amount,
        'description', c.description,
        'expiryDate', c.expiry_date,
        'additionalInfo', c.additional_info
      )
    ) AS user_coupon
  FROM public.user_coupons uc1
  JOIN public.coupons c ON c.id = uc1.coupon_id
  WHERE uc1.id = oi.applied_user_coupon_id
  LIMIT 1
) uc ON true;

-- claim_list_view: custom 타입도 reformData 반환
CREATE OR REPLACE VIEW public.claim_list_view
WITH (security_invoker = true)
AS
SELECT
  cl.id,
  cl.claim_number AS "claimNumber",
  to_char(cl.created_at, 'YYYY-MM-DD') AS date,
  cl.status,
  cl.type,
  cl.reason,
  cl.description,
  cl.quantity AS "claimQuantity",
  o.id AS "orderId",
  o.order_number AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS "orderDate",
  jsonb_build_object(
    'id', oi.item_id,
    'type', oi.item_type,
    'product', CASE
      WHEN oi.item_type = 'product' THEN to_jsonb(p)
      ELSE null
    END,
    'selectedOption', CASE
      WHEN oi.item_type = 'product' AND oi.selected_option_id IS NOT NULL THEN (
        SELECT option
        FROM jsonb_array_elements(coalesce(to_jsonb(p)->'options', '[]'::jsonb)) option
        WHERE option->>'id' = oi.selected_option_id
        LIMIT 1
      )
      ELSE null
    END,
    'quantity', oi.quantity,
    'reformData', CASE
      WHEN oi.item_type IN ('reform', 'custom') THEN oi.reform_data
      ELSE null
    END,
    'appliedCoupon', uc.user_coupon
  ) AS item
FROM public.claims cl
JOIN public.orders o
  ON o.id = cl.order_id AND o.user_id = auth.uid()
JOIN public.order_items oi
  ON oi.id = cl.order_item_id
LEFT JOIN LATERAL (
  SELECT
    plv.id, plv.code, plv.name, plv.price, plv.image,
    plv."detailImages", plv.category, plv.color, plv.pattern,
    plv.material, plv.info, plv.created_at, plv.updated_at,
    plv.options, plv.likes, plv."isLiked"
  FROM public.product_list_view plv
  WHERE oi.item_type = 'product'
    AND oi.product_id IS NOT NULL
    AND plv.id = oi.product_id
  LIMIT 1
) p ON true
LEFT JOIN LATERAL (
  SELECT
    uc1.id,
    jsonb_build_object(
      'id', uc1.id,
      'userId', uc1.user_id,
      'couponId', uc1.coupon_id,
      'status', uc1.status,
      'issuedAt', uc1.issued_at,
      'expiresAt', uc1.expires_at,
      'usedAt', uc1.used_at,
      'coupon', jsonb_build_object(
        'id', cp.id,
        'name', cp.name,
        'discountType', cp.discount_type,
        'discountValue', cp.discount_value,
        'maxDiscountAmount', cp.max_discount_amount,
        'description', cp.description,
        'expiryDate', cp.expiry_date,
        'additionalInfo', cp.additional_info
      )
    ) AS user_coupon
  FROM public.user_coupons uc1
  JOIN public.coupons cp ON cp.id = uc1.coupon_id
  WHERE uc1.id = oi.applied_user_coupon_id
  LIMIT 1
) uc ON true
WHERE cl.user_id = auth.uid();

-- admin_order_list_view: LATERAL join 조건에 custom 추가
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
      WHERE oi2.order_id = o.id AND oi2.item_type IN ('reform', 'custom')
      LIMIT 1
    ) AS reform_data,
    SUM(oi.quantity)::integer AS item_quantity
  FROM public.order_items oi
  WHERE oi.order_id = o.id AND oi.item_type IN ('reform', 'custom')
) ri ON o.order_type IN ('custom', 'repair');

-- ── 4. RPC 재생성: create_custom_order_txn ────────────────────

CREATE OR REPLACE FUNCTION public.create_custom_order_txn(
  p_options        jsonb,
  p_quantity       integer,
  p_sample         boolean,
  p_additional_notes text,
  p_reference_images jsonb,
  p_shipping_address_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id            uuid := auth.uid();
  v_order_id           uuid;
  v_order_number       text;
  v_payment_group_id   uuid := gen_random_uuid();
  v_sewing_cost        integer;
  v_fabric_cost        integer;
  v_total_cost         integer;
  v_base_unit          integer;
  v_reform_data        jsonb;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  select sewing_cost, fabric_cost, total_cost
    into v_sewing_cost, v_fabric_cost, v_total_cost
  from public.calculate_custom_order_amounts(p_options, p_quantity);

  v_base_unit := v_total_cost / p_quantity;

  v_reform_data := jsonb_build_object(
    'options', p_options,
    'pricing', jsonb_build_object(
      'sewing_cost', v_sewing_cost,
      'fabric_cost', v_fabric_cost,
      'total_cost', v_total_cost
    ),
    'quantity', p_quantity,
    'sample', p_sample,
    'additional_notes', p_additional_notes,
    'reference_images', coalesce(p_reference_images, '[]'::jsonb)
  );

  v_order_number := 'C' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 8));

  insert into public.orders (
    user_id, order_number, order_type, status,
    total_price, original_price, total_discount,
    shipping_address_id, payment_group_id, shipping_cost
  )
  values (
    v_user_id, v_order_number, 'custom', '대기중',
    v_total_cost, v_total_cost, 0,
    p_shipping_address_id, v_payment_group_id, 0
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    item_id,
    item_type,
    product_id,
    selected_option_id,
    reform_data,
    quantity,
    unit_price,
    discount_amount,
    line_discount_amount,
    applied_user_coupon_id
  )
  values (
    v_order_id,
    'custom-order-' || v_order_id::text,
    'custom',
    null,
    null,
    v_reform_data,
    p_quantity,
    v_base_unit,
    0,
    0,
    null
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_group_id', v_payment_group_id
  );
end;
$$;
