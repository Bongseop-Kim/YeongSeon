ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS display_name text;

UPDATE public.coupons
SET display_name = coalesce(
  nullif(display_name, ''),
  CASE name
    WHEN 'SAMPLE_DISCOUNT_SEWING' THEN '봉제 샘플 할인 쿠폰'
    WHEN 'SAMPLE_DISCOUNT_FABRIC_PRINTING' THEN '원단 샘플 할인 쿠폰 (날염)'
    WHEN 'SAMPLE_DISCOUNT_FABRIC_YARN_DYED' THEN '원단 샘플 할인 쿠폰 (선염)'
    WHEN 'SAMPLE_DISCOUNT_FABRIC_AND_SEWING_PRINTING' THEN '원단+봉제 샘플 할인 쿠폰 (날염)'
    WHEN 'SAMPLE_DISCOUNT_FABRIC_AND_SEWING_YARN_DYED' THEN '원단+봉제 샘플 할인 쿠폰 (선염)'
    ELSE null
  END,
  nullif(description, ''),
  name
);

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
        'displayName', c.display_name,
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
      WHEN oi.item_type IN ('reform', 'custom', 'sample') THEN oi.item_data
      ELSE null
    END,
    'sampleData', CASE
      WHEN oi.item_type = 'sample' THEN oi.item_data
      ELSE null
    END,
    'appliedCoupon', uc.user_coupon
  ) AS item,
  cl.refund_data
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
        'displayName', cp.display_name,
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

CREATE OR REPLACE FUNCTION public.get_cart_items(p_user_id uuid, p_active_only boolean DEFAULT true)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  with cart as (
    select *
    from cart_items
    where user_id = p_user_id
      and user_id = auth.uid()
    order by created_at asc
  ),
  product_ids as (
    select array_agg(distinct product_id)::integer[] as ids
    from cart
    where product_id is not null
  ),
  products as (
    select *
    from get_products_by_ids(
      coalesce((select ids from product_ids), '{}'::integer[])
    )
  ),
  coupon_ids as (
    select array_agg(distinct applied_user_coupon_id)::uuid[] as ids
    from cart
    where applied_user_coupon_id is not null
  ),
  coupons as (
    select
      uc.id,
      jsonb_build_object(
        'id', uc.id,
        'userId', uc.user_id,
        'couponId', uc.coupon_id,
        'status', uc.status,
        'issuedAt', uc.issued_at,
        'expiresAt', uc.expires_at,
        'usedAt', uc.used_at,
        'coupon', jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'displayName', c.display_name,
          'discountType', c.discount_type,
          'discountValue', c.discount_value,
          'maxDiscountAmount', c.max_discount_amount,
          'description', c.description,
          'expiryDate', c.expiry_date,
          'additionalInfo', c.additional_info
        )
      ) as user_coupon
    from user_coupons uc
    join coupons c on c.id = uc.coupon_id
    where uc.user_id = p_user_id
      and uc.user_id = auth.uid()
      and uc.id = any(coalesce((select ids from coupon_ids), '{}'::uuid[]))
      and (
        not p_active_only
        or (
          uc.status = 'active'
          and (uc.expires_at is null or uc.expires_at > now())
          and c.is_active = true
          and c.expiry_date >= current_date
        )
      )
  )
  select jsonb_build_object(
    'id', cart.item_id,
    'type', cart.item_type,
    'product', case
      when cart.item_type = 'product' then to_jsonb(p)
      else null
    end,
    'selectedOption', case
      when cart.item_type = 'product' and cart.selected_option_id is not null then (
        select option
        from jsonb_array_elements(
          coalesce(to_jsonb(p)->'options', '[]'::jsonb)
        ) option
        where option->>'id' = cart.selected_option_id
        limit 1
      )
      else null
    end,
    'quantity', cart.quantity,
    'reformData', cart.reform_data,
    'appliedCoupon', coupons.user_coupon,
    'appliedCouponId', cart.applied_user_coupon_id
  )
  from cart
  left join products p on p.id = cart.product_id
  left join coupons on coupons.id = cart.applied_user_coupon_id
  order by cart.created_at asc;
$$;
