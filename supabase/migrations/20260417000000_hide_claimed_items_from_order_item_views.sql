-- fix: 클레임 신청된 아이템을 order_item_view에서 제거
--
-- 클레임(취소/반품/교환)이 1개라도 존재하는 order_item은 고객용 뷰에서 제외한다.
-- 클레임 상태(접수/처리중/완료/거부 등)에 무관하게 적용되며,
-- 클레임으로 종결된 아이템은 주문 목록·상세에서 영구 제거된다.
-- admin_order_item_view는 관리자가 클레임 중인 아이템도 확인해야 하므로 필터 미적용.

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
    WHEN oi.item_type IN ('reform', 'custom', 'sample') THEN oi.item_data
    ELSE null
  END AS "reformData",
  uc.user_coupon AS "appliedCoupon",
  CASE
    WHEN oi.item_type = 'sample' THEN oi.item_data
    ELSE null
  END AS "sampleData"
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
) uc ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.claims cl
  WHERE cl.order_item_id = oi.id
);

-- ── admin_order_item_view ──────────────────────────────────────
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
  oi.item_data     AS "reformData",
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

-- NOT EXISTS 서브쿼리 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_claims_order_item_id ON public.claims(order_item_id);
