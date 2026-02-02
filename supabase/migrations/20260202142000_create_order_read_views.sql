create or replace view public.order_list_view
with (security_invoker = true) as
select
  o.id,
  o.order_number as "orderNumber",
  to_char(o.created_at, 'YYYY-MM-DD') as date,
  o.status,
  o.total_price as "totalPrice",
  o.created_at
from public.orders o
where o.user_id = auth.uid();

create or replace view public.order_item_view
with (security_invoker = true) as
select
  oi.order_id,
  oi.created_at,
  oi.item_id as id,
  oi.item_type as type,
  case
    when oi.item_type = 'product' then to_jsonb(p)
    else null
  end as product,
  case
    when oi.item_type = 'product' and oi.selected_option_id is not null then (
      select option
      from jsonb_array_elements(
        coalesce(to_jsonb(p)->'options', '[]'::jsonb)
      ) option
      where option->>'id' = oi.selected_option_id
      limit 1
    )
    else null
  end as "selectedOption",
  oi.quantity,
  case
    when oi.item_type = 'reform' then oi.reform_data
    else null
  end as "reformData",
  uc.user_coupon as "appliedCoupon"
from public.order_items oi
join public.orders o
  on o.id = oi.order_id
 and o.user_id = auth.uid()
left join lateral (
  select plv.*
  from public.product_list_view plv
  where oi.item_type = 'product'
    and oi.product_id is not null
    and plv.id = oi.product_id
  limit 1
) p
  on true
left join lateral (
  select
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
    ) as user_coupon
  from public.user_coupons uc1
  join public.coupons c
    on c.id = uc1.coupon_id
  where uc1.id = oi.applied_user_coupon_id
  limit 1
) uc
  on true;
