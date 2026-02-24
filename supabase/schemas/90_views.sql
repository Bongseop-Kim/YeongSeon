-- =============================================================
-- 90_views.sql  –  Read views (all security_invoker = true)
-- =============================================================

-- ── product_list_view ────────────────────────────────────────
CREATE OR REPLACE VIEW public.product_list_view
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.code,
  p.name,
  p.price,
  p.image,
  p.detail_images AS "detailImages",
  p.category,
  p.color,
  p.pattern,
  p.material,
  p.info,
  p.created_at,
  p.updated_at,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', po.option_id,
        'name', po.name,
        'additionalPrice', po.additional_price
      )
      order by po.option_id
    ) filter (where po.id is not null),
    '[]'::jsonb
  ) AS options,
  coalesce(lc.likes, 0) AS likes,
  coalesce(public.product_is_liked_rpc(p.id), false) AS "isLiked"
FROM public.products p
LEFT JOIN public.product_options po ON po.product_id = p.id
LEFT JOIN public.product_like_counts_rpc() lc ON lc.product_id = p.id
GROUP BY
  p.id, p.code, p.name, p.price, p.image, p.detail_images,
  p.category, p.color, p.pattern, p.material, p.info,
  p.created_at, p.updated_at, lc.likes;

-- ── order_list_view ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.order_list_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.order_number  AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.status,
  o.total_price   AS "totalPrice",
  o.created_at
FROM public.orders o
WHERE o.user_id = auth.uid();

-- ── order_item_view ──────────────────────────────────────────
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
    WHEN oi.item_type = 'reform' THEN oi.reform_data
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

-- ── claim_list_view ──────────────────────────────────────────
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
      WHEN oi.item_type = 'reform' THEN oi.reform_data
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

-- =============================================================
-- Admin Views
-- =============================================================

-- ── admin_user_coupon_view ──────────────────────────────────
CREATE OR REPLACE VIEW public.admin_user_coupon_view
WITH (security_invoker = true)
AS
SELECT
  uc.id,
  uc.user_id       AS "userId",
  uc.coupon_id     AS "couponId",
  uc.status,
  uc.issued_at     AS "issuedAt",
  uc.expires_at    AS "expiresAt",
  uc.used_at       AS "usedAt",
  p.name           AS "userName",
  p.phone          AS "userPhone",
  public.admin_get_email(uc.user_id) AS "userEmail"
FROM public.user_coupons uc
LEFT JOIN public.profiles p ON p.id = uc.user_id;

-- ── admin_order_list_view ──────────────────────────────────
CREATE OR REPLACE VIEW public.admin_order_list_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.user_id       AS "userId",
  o.order_number   AS "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') AS date,
  o.status,
  o.total_price    AS "totalPrice",
  o.original_price AS "originalPrice",
  o.total_discount AS "totalDiscount",
  o.created_at,
  o.updated_at,
  p.name           AS "customerName",
  p.phone          AS "customerPhone"
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.user_id;

-- ── admin_order_item_view ──────────────────────────────────
CREATE OR REPLACE VIEW public.admin_order_item_view
WITH (security_invoker = true)
AS
SELECT
  oi.id,
  oi.order_id      AS "orderId",
  oi.item_id       AS "itemId",
  oi.item_type     AS "itemType",
  oi.product_id    AS "productId",
  oi.selected_option_id AS "selectedOptionId",
  oi.reform_data   AS "reformData",
  oi.quantity,
  oi.unit_price    AS "unitPrice",
  oi.discount_amount     AS "discountAmount",
  oi.line_discount_amount AS "lineDiscountAmount",
  oi.applied_user_coupon_id AS "appliedUserCouponId",
  oi.created_at,
  pr.name  AS "productName",
  pr.code  AS "productCode",
  pr.image AS "productImage"
FROM public.order_items oi
LEFT JOIN public.products pr ON pr.id = oi.product_id;

-- ── admin_claim_list_view ──────────────────────────────────
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
  o.id             AS "orderId",
  o.order_number   AS "orderNumber",
  p.name           AS "customerName",
  p.phone          AS "customerPhone",
  oi.item_type     AS "itemType",
  pr.name          AS "productName"
FROM public.claims cl
JOIN public.orders o ON o.id = cl.order_id
JOIN public.order_items oi ON oi.id = cl.order_item_id
LEFT JOIN public.products pr ON pr.id = oi.product_id
LEFT JOIN public.profiles p ON p.id = cl.user_id;
