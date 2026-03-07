-- ============================================================= 
-- 92_functions_cart.sql  – Cart RPC functions 
-- =============================================================
-- ── replace_cart_items ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.replace_cart_items(p_user_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $_$
declare
  item_record jsonb;
  coupon_id_text text;
  quantity_text text;
  quantity_value integer;
begin
  if auth.uid() is null or p_user_id is null then
    raise exception 'unauthorized: authentication required';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'unauthorized: cart can only be modified for the current user';
  end if;

  delete from cart_items where user_id = p_user_id;

  if p_items is not null and jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid p_items: expected a JSON array';
  end if;

  if p_items is not null and jsonb_array_length(p_items) > 0 then
    for item_record in select * from jsonb_array_elements(p_items)
    loop
      coupon_id_text := coalesce(
        item_record->'appliedCoupon'->>'id',
        item_record->>'appliedCouponId'
      );

      quantity_text := item_record->>'quantity';
      if quantity_text is null or quantity_text !~ '^[0-9]+$' then
        raise exception 'invalid quantity: %', coalesce(quantity_text, 'null');
      end if;

      quantity_value := quantity_text::integer;
      if quantity_value <= 0 then
        raise exception 'invalid quantity (must be > 0): %', quantity_text;
      end if;

      insert into cart_items (
        user_id,
        item_id,
        item_type,
        product_id,
        selected_option_id,
        reform_data,
        quantity,
        applied_user_coupon_id
      )
      values (
        p_user_id,
        item_record->>'id',
        (item_record->>'type')::text,
        case
          when item_record->'product' is null then null
          when item_record->'product'->>'id' is null or item_record->'product'->>'id' = 'null' then null
          else (item_record->'product'->>'id')::integer
        end,
        case
          when item_record->'selectedOption' is null then null
          when item_record->'selectedOption'->>'id' is null or item_record->'selectedOption'->>'id' = '' then null
          else item_record->'selectedOption'->>'id'
        end,
        case
          when item_record->'reformData' is null or item_record->'reformData' = 'null'::jsonb then null
          else item_record->'reformData'
        end,
        quantity_value,
        case
          when coupon_id_text is null or coupon_id_text = '' or coupon_id_text = 'null' then null
          else coupon_id_text::uuid
        end
      );
    end loop;
  end if;
end;
$_$;

-- ── remove_cart_items_by_ids ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.remove_cart_items_by_ids(
  p_user_id uuid,
  p_item_ids text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if auth.uid() is null or p_user_id is null then
    raise exception 'unauthorized: authentication required';
  end if;

  if p_user_id is distinct from auth.uid() then
    raise exception 'unauthorized: cart can only be modified for the current user';
  end if;

  if p_item_ids is null or cardinality(p_item_ids) = 0 then
    return;
  end if;

  delete from cart_items
  where user_id = p_user_id
    and item_id = any(p_item_ids);
end;
$$;

-- ── get_cart_items ───────────────────────────────────────────
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

