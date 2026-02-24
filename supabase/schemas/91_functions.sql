-- =============================================================
-- 91_functions.sql  –  RPC / business functions
-- =============================================================

-- ── generate_order_number ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
declare
  order_num text;
  date_str text;
  seq_num integer;
begin
  date_str := to_char(now(), 'YYYYMMDD');

  -- Serialize same-day order number allocation to prevent duplicates.
  perform pg_advisory_xact_lock(hashtext(date_str));

  select coalesce(max(cast(substring(order_number from 14) as integer)), 0) + 1
  into seq_num
  from orders
  where order_number like 'ORD-' || date_str || '-%';

  order_num := 'ORD-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return order_num;
end;
$$;

-- ── generate_claim_number ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_claim_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
declare
  claim_num text;
  date_str text;
  seq_num integer;
begin
  date_str := to_char(now(), 'YYYYMMDD');

  -- Serialize same-day claim number allocation to prevent duplicates.
  -- Uses 'CLM' prefix in hashtext to avoid collision with generate_order_number().
  perform pg_advisory_xact_lock(hashtext('CLM' || date_str));

  select coalesce(max(cast(substring(claim_number from 14) as integer)), 0) + 1
  into seq_num
  from claims
  where claim_number like 'CLM-' || date_str || '-%';

  claim_num := 'CLM-' || date_str || '-' || lpad(seq_num::text, 3, '0');
  return claim_num;
end;
$$;

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
          when coupon_id_text is null or coupon_id_text = '' then null
          else coupon_id_text::uuid
        end
      );
    end loop;
  end if;
end;
$_$;

-- ── get_cart_items ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_cart_items(p_user_id uuid, p_active_only boolean DEFAULT true)
RETURNS SETOF jsonb
LANGUAGE sql
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

-- ── create_order_txn ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_order_txn(p_shipping_address_id uuid, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_normalized_items jsonb := '[]'::jsonb;

  v_item_id text;
  v_item_type text;
  v_product_id integer;
  v_selected_option_id text;
  v_reform_data jsonb;
  v_quantity integer;
  v_applied_coupon_id uuid;
  v_unit_price integer;
  v_discount_amount integer;
  v_per_unit_cap integer;
  v_option_additional_price integer;
  v_line_discount_total integer;

  v_original_price integer := 0;
  v_total_discount integer := 0;
  v_total_price integer := 0;
  v_reform_base_cost constant integer := 15000;
  v_used_coupon_ids uuid[] := '{}'::uuid[];
  v_coupon record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'Order items are required';
  end if;

  if not exists (
    select 1
    from shipping_addresses
    where id = p_shipping_address_id
      and user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := nullif(v_item->>'item_id', '');
    v_item_type := v_item->>'item_type';
    v_quantity := nullif(v_item->>'quantity', '')::integer;
    v_applied_coupon_id := nullif(v_item->>'applied_user_coupon_id', '')::uuid;
    v_discount_amount := 0;
    v_option_additional_price := 0;
    v_line_discount_total := 0;

    if v_item_id is null then
      raise exception 'Invalid item id';
    end if;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Invalid item quantity';
    end if;

    if v_item_type = 'product' then
      v_product_id := nullif(v_item->>'product_id', '')::integer;
      v_selected_option_id := nullif(v_item->>'selected_option_id', '');
      v_reform_data := null;

      if v_product_id is null then
        raise exception 'Product id is required';
      end if;

      select p.price
      into v_unit_price
      from products p
      where p.id = v_product_id;

      if not found then
        raise exception 'Product not found';
      end if;

      if v_selected_option_id is not null then
        select coalesce(po.additional_price, 0)
        into v_option_additional_price
        from product_options po
        where po.product_id = v_product_id
          and po.option_id = v_selected_option_id
        limit 1;

        if not found then
          raise exception 'Selected option not found';
        end if;
      end if;

      v_unit_price := v_unit_price + v_option_additional_price;
    elsif v_item_type = 'reform' then
      v_product_id := null;
      v_selected_option_id := null;
      v_reform_data := v_item->'reform_data';

      if v_reform_data is null or v_reform_data = 'null'::jsonb then
        raise exception 'Reform data is required';
      end if;

      v_unit_price := v_reform_base_cost;
      v_reform_data := jsonb_set(
        v_reform_data,
        '{cost}',
        to_jsonb(v_reform_base_cost),
        true
      );
    else
      raise exception 'Invalid item type';
    end if;

    if v_applied_coupon_id is not null then
      if v_applied_coupon_id = any(v_used_coupon_ids) then
        raise exception 'Coupon can only be applied once per order';
      end if;

      select
        uc.id,
        uc.status,
        uc.expires_at,
        c.discount_type,
        c.discount_value,
        c.max_discount_amount,
        c.expiry_date,
        c.is_active
      into v_coupon
      from user_coupons uc
      join coupons c on c.id = uc.coupon_id
      where uc.id = v_applied_coupon_id
        and uc.user_id = v_user_id
      for update;

      if not found then
        raise exception 'Coupon not found';
      end if;

      if v_coupon.status <> 'active' then
        raise exception 'Coupon is not available';
      end if;

      if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
        raise exception 'Coupon has expired';
      end if;

      if coalesce(v_coupon.is_active, false) is not true then
        raise exception 'Coupon is not active';
      end if;

      if v_coupon.expiry_date is not null and v_coupon.expiry_date < current_date then
        raise exception 'Coupon has expired';
      end if;

      if v_coupon.discount_type = 'percentage' then
        v_discount_amount :=
          floor(v_unit_price * (v_coupon.discount_value::numeric / 100.0))::integer;
      elsif v_coupon.discount_type = 'fixed' then
        v_discount_amount := floor(v_coupon.discount_value::numeric)::integer;
      else
        raise exception 'Invalid coupon type';
      end if;

      v_discount_amount := greatest(0, least(v_discount_amount, v_unit_price));

      if v_coupon.max_discount_amount is not null then
        v_per_unit_cap :=
          floor(v_coupon.max_discount_amount::numeric / v_quantity)::integer;
        v_discount_amount := least(v_discount_amount, v_per_unit_cap);
      end if;

      v_line_discount_total := v_discount_amount * v_quantity;
      v_used_coupon_ids := array_append(v_used_coupon_ids, v_applied_coupon_id);
    end if;

    v_original_price := v_original_price + (v_unit_price * v_quantity);
    if v_applied_coupon_id is not null then
      v_total_discount := v_total_discount + v_line_discount_total;
    end if;

    v_normalized_items := v_normalized_items || jsonb_build_array(
      jsonb_build_object(
        'item_id', v_item_id,
        'item_type', v_item_type,
        'product_id', v_product_id,
        'selected_option_id', v_selected_option_id,
        'reform_data', v_reform_data,
        'quantity', v_quantity,
        'unit_price', v_unit_price,
        'discount_amount', v_discount_amount,
        'line_discount_amount', v_line_discount_total,
        'applied_user_coupon_id', v_applied_coupon_id
      )
    );
  end loop;

  v_total_price := v_original_price - v_total_discount;
  v_order_number := generate_order_number();

  insert into orders (
    user_id,
    order_number,
    shipping_address_id,
    total_price,
    original_price,
    total_discount,
    status
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_price,
    v_original_price,
    v_total_discount,
    '대기중'
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(v_normalized_items)
  loop
    insert into order_items (
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
      v_item->>'item_id',
      v_item->>'item_type',
      nullif(v_item->>'product_id', '')::integer,
      nullif(v_item->>'selected_option_id', ''),
      case
        when v_item->'reform_data' is null or v_item->'reform_data' = 'null'::jsonb
          then null
        else v_item->'reform_data'
      end,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::integer,
      (v_item->>'discount_amount')::integer,
      coalesce((v_item->>'line_discount_amount')::integer, 0),
      nullif(v_item->>'applied_user_coupon_id', '')::uuid
    );
  end loop;

  if array_length(v_used_coupon_ids, 1) is not null then
    update user_coupons
    set status = 'used',
        used_at = now(),
        updated_at = now()
    where user_id = v_user_id
      and status = 'active'
      and id = any(v_used_coupon_ids);
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number
  );
end;
$$;

-- ── create_claim ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_claim(
  p_type text,
  p_order_id uuid,
  p_item_id text,
  p_reason text,
  p_description text DEFAULT NULL,
  p_quantity integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order_item record;
  v_claim_quantity integer;
  v_claim_number text;
  v_claim_id uuid;
begin
  -- 1. Auth check
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- 2. Type validation
  if p_type not in ('cancel', 'return', 'exchange') then
    raise exception 'Invalid claim type';
  end if;

  -- 3. Reason validation
  if p_reason not in (
    'change_mind', 'defect', 'delay', 'wrong_item',
    'size_mismatch', 'color_mismatch', 'other'
  ) then
    raise exception 'Invalid claim reason';
  end if;

  -- 4. Order ownership check
  if not exists (
    select 1
    from orders
    where id = p_order_id
      and user_id = v_user_id
  ) then
    raise exception 'Order not found';
  end if;

  -- 5. Order item lookup (p_item_id is order_items.item_id text)
  begin
    select oi.id, oi.quantity
    into strict v_order_item
    from order_items oi
    where oi.item_id = p_item_id
      and oi.order_id = p_order_id;
  exception
    when no_data_found then
      raise exception 'Order item not found';
    when too_many_rows then
      raise exception 'Multiple order items found for given order_id and item_id';
  end;

  -- 6. Quantity validation
  v_claim_quantity := coalesce(p_quantity, v_order_item.quantity);
  if v_claim_quantity <= 0 or v_claim_quantity > v_order_item.quantity then
    raise exception 'Invalid claim quantity';
  end if;

  -- 7. Duplicate claim pre-check (final race-safety enforced by unique index)
  if exists (
    select 1
    from claims
    where order_item_id = v_order_item.id
      and type = p_type
      and status in ('접수', '처리중')
  ) then
    raise exception 'Active claim already exists for this item';
  end if;

  -- 8. Generate claim number
  v_claim_number := generate_claim_number();

  -- 9. Insert claim (atomic conflict handling via partial unique index)
  insert into claims (
    user_id,
    order_id,
    order_item_id,
    claim_number,
    type,
    reason,
    description,
    quantity
  )
  values (
    v_user_id,
    p_order_id,
    v_order_item.id,
    v_claim_number,
    p_type,
    p_reason,
    p_description,
    v_claim_quantity
  )
  on conflict (order_item_id, type) where (status in ('접수', '처리중'))
  do nothing
  returning id into v_claim_id;

  if v_claim_id is null then
    raise exception 'Active claim already exists for this item';
  end if;

  return jsonb_build_object(
    'claim_id', v_claim_id,
    'claim_number', v_claim_number
  );
end;
$$;

-- ── calculate_custom_order_amounts ───────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_custom_order_amounts(p_options jsonb, p_quantity integer)
RETURNS TABLE (sewing_cost integer, fabric_cost integer, total_cost integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_start_cost integer;
  v_sewing_per_cost integer;
  v_auto_tie_cost integer;
  v_triangle_stitch_cost integer;
  v_side_stitch_cost integer;
  v_bar_tack_cost integer;
  v_dimple_cost integer;
  v_spoderato_cost integer;
  v_fold7_cost integer;
  v_wool_interlining_cost integer;
  v_brand_label_cost integer;
  v_care_label_cost integer;
  v_yarn_dyed_design_cost integer;

  v_tie_type text;
  v_interlining text;
  v_design_type text;
  v_fabric_type text;
  v_fabric_provided boolean;

  v_triangle_stitch boolean;
  v_side_stitch boolean;
  v_bar_tack boolean;
  v_dimple boolean;
  v_spoderato boolean;
  v_fold7 boolean;
  v_brand_label boolean;
  v_care_label boolean;
  v_exclusive_style_count integer;

  v_sewing_per_unit integer;
  v_unit_fabric_cost integer;
  v_fabric_amount integer;
begin
  if p_options is null or jsonb_typeof(p_options) <> 'object' then
    raise exception 'Invalid options payload';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid quantity';
  end if;

  select
    max(case when key = 'START_COST' then amount end),
    max(case when key = 'SEWING_PER_COST' then amount end),
    max(case when key = 'AUTO_TIE_COST' then amount end),
    max(case when key = 'TRIANGLE_STITCH_COST' then amount end),
    max(case when key = 'SIDE_STITCH_COST' then amount end),
    max(case when key = 'BAR_TACK_COST' then amount end),
    max(case when key = 'DIMPLE_COST' then amount end),
    max(case when key = 'SPODERATO_COST' then amount end),
    max(case when key = 'FOLD7_COST' then amount end),
    max(case when key = 'WOOL_INTERLINING_COST' then amount end),
    max(case when key = 'BRAND_LABEL_COST' then amount end),
    max(case when key = 'CARE_LABEL_COST' then amount end),
    max(case when key = 'YARN_DYED_DESIGN_COST' then amount end)
  into
    v_start_cost,
    v_sewing_per_cost,
    v_auto_tie_cost,
    v_triangle_stitch_cost,
    v_side_stitch_cost,
    v_bar_tack_cost,
    v_dimple_cost,
    v_spoderato_cost,
    v_fold7_cost,
    v_wool_interlining_cost,
    v_brand_label_cost,
    v_care_label_cost,
    v_yarn_dyed_design_cost
  from public.custom_order_pricing_constants
  where key = any (array[
    'START_COST',
    'SEWING_PER_COST',
    'AUTO_TIE_COST',
    'TRIANGLE_STITCH_COST',
    'SIDE_STITCH_COST',
    'BAR_TACK_COST',
    'DIMPLE_COST',
    'SPODERATO_COST',
    'FOLD7_COST',
    'WOOL_INTERLINING_COST',
    'BRAND_LABEL_COST',
    'CARE_LABEL_COST',
    'YARN_DYED_DESIGN_COST'
  ]);

  if v_start_cost is null
    or v_sewing_per_cost is null
    or v_auto_tie_cost is null
    or v_triangle_stitch_cost is null
    or v_side_stitch_cost is null
    or v_bar_tack_cost is null
    or v_dimple_cost is null
    or v_spoderato_cost is null
    or v_fold7_cost is null
    or v_wool_interlining_cost is null
    or v_brand_label_cost is null
    or v_care_label_cost is null
    or v_yarn_dyed_design_cost is null then
    raise exception 'Custom order pricing constants are not configured';
  end if;

  v_tie_type := coalesce(p_options->>'tie_type', '');
  v_interlining := coalesce(p_options->>'interlining', '');
  v_design_type := nullif(p_options->>'design_type', '');
  v_fabric_type := nullif(p_options->>'fabric_type', '');
  v_fabric_provided := coalesce((p_options->>'fabric_provided')::boolean, false);

  v_triangle_stitch := coalesce((p_options->>'triangle_stitch')::boolean, false);
  v_side_stitch := coalesce((p_options->>'side_stitch')::boolean, false);
  v_bar_tack := coalesce((p_options->>'bar_tack')::boolean, false);
  v_dimple := coalesce((p_options->>'dimple')::boolean, false);
  v_spoderato := coalesce((p_options->>'spoderato')::boolean, false);
  v_fold7 := coalesce((p_options->>'fold7')::boolean, false);
  v_brand_label := coalesce((p_options->>'brand_label')::boolean, false);
  v_care_label := coalesce((p_options->>'care_label')::boolean, false);
  v_exclusive_style_count :=
    (case when v_dimple then 1 else 0 end)
    + (case when v_spoderato then 1 else 0 end)
    + (case when v_fold7 then 1 else 0 end);

  -- dimple/spoderato/fold7 are treated as mutually exclusive sewing styles.
  if v_exclusive_style_count > 1 then
    raise exception 'Only one of dimple, spoderato, or fold7 can be selected';
  end if;

  v_sewing_per_unit := v_sewing_per_cost;

  if v_tie_type = 'AUTO' then
    v_sewing_per_unit := v_sewing_per_unit + v_auto_tie_cost;
  end if;

  if v_triangle_stitch then
    v_sewing_per_unit := v_sewing_per_unit + v_triangle_stitch_cost;
  end if;

  if v_side_stitch then
    v_sewing_per_unit := v_sewing_per_unit + v_side_stitch_cost;
  end if;

  if v_bar_tack then
    v_sewing_per_unit := v_sewing_per_unit + v_bar_tack_cost;
  end if;

  if v_dimple then
    v_sewing_per_unit := v_sewing_per_unit + v_dimple_cost;
  end if;

  if v_spoderato then
    v_sewing_per_unit := v_sewing_per_unit + v_spoderato_cost;
  end if;

  if v_fold7 then
    v_sewing_per_unit := v_sewing_per_unit + v_fold7_cost;
  end if;

  if v_interlining = 'WOOL' then
    v_sewing_per_unit := v_sewing_per_unit + v_wool_interlining_cost;
  end if;

  if v_brand_label then
    v_sewing_per_unit := v_sewing_per_unit + v_brand_label_cost;
  end if;

  if v_care_label then
    v_sewing_per_unit := v_sewing_per_unit + v_care_label_cost;
  end if;

  sewing_cost := (v_sewing_per_unit * p_quantity) + v_start_cost;

  if v_fabric_provided then
    v_fabric_amount := 0;
  elsif v_design_type is null or v_fabric_type is null then
    v_fabric_amount := 0;
  else
    select fp.unit_price
    into v_unit_fabric_cost
    from public.custom_order_fabric_prices fp
    where fp.design_type = v_design_type
      and fp.fabric_type = v_fabric_type;

    if v_unit_fabric_cost is null then
      raise exception 'Unsupported design/fabric option for custom order pricing';
    end if;

    v_fabric_amount := round(
      (p_quantity::numeric * v_unit_fabric_cost::numeric) / 4
    )::integer
      + case when v_design_type = 'YARN_DYED' then v_yarn_dyed_design_cost else 0 end;
  end if;

  fabric_cost := v_fabric_amount;
  total_cost := sewing_cost + fabric_cost;

  return next;
end;
$$;

-- ── create_custom_order_txn ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_custom_order_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_image_urls text[] DEFAULT '{}'::text[],
  p_additional_notes text DEFAULT '',
  p_sample boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_sewing_cost integer;
  v_fabric_cost integer;
  v_total_cost integer;
  v_reform_data jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  if not exists (
    select 1
    from public.shipping_addresses sa
    where sa.id = p_shipping_address_id
      and sa.user_id = v_user_id
  ) then
    raise exception 'Shipping address not found';
  end if;

  select
    amounts.sewing_cost,
    amounts.fabric_cost,
    amounts.total_cost
  into
    v_sewing_cost,
    v_fabric_cost,
    v_total_cost
  from public.calculate_custom_order_amounts(p_options, p_quantity) as amounts;

  v_order_number := public.generate_order_number();

  insert into public.orders (
    user_id,
    order_number,
    shipping_address_id,
    total_price,
    original_price,
    total_discount,
    status
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_cost,
    v_total_cost,
    0,
    '대기중'
  )
  returning id into v_order_id;

  v_reform_data := jsonb_build_object(
    'custom_order', true,
    'quantity', p_quantity,
    'options', p_options,
    'reference_image_urls', to_jsonb(coalesce(p_reference_image_urls, '{}'::text[])),
    'additional_notes', coalesce(p_additional_notes, ''),
    'sample', coalesce(p_sample, false),
    'pricing', jsonb_build_object(
      'sewing_cost', v_sewing_cost,
      'fabric_cost', v_fabric_cost,
      'total_cost', v_total_cost
    )
  );

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
    'reform',
    null,
    null,
    v_reform_data,
    1,
    v_total_cost,
    0,
    0,
    null
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number
  );
end;
$$;
