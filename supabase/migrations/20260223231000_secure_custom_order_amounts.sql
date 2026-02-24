

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'customer',
    'admin',
    'manager'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_custom_order_amounts"("p_options" "jsonb", "p_quantity" integer) RETURNS TABLE("sewing_cost" integer, "fabric_cost" integer, "total_cost" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."calculate_custom_order_amounts"("p_options" "jsonb", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text" DEFAULT NULL::"text", "p_quantity" integer DEFAULT NULL::integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[] DEFAULT '{}'::"text"[], "p_additional_notes" "text" DEFAULT ''::"text", "p_sample" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_sample" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  v_capped_line_discount integer;
  v_discount_remainder integer;
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

      v_capped_line_discount := v_discount_amount * v_quantity;
      if v_coupon.max_discount_amount is not null then
        v_capped_line_discount := least(v_capped_line_discount, v_coupon.max_discount_amount);
      end if;

      v_discount_amount := floor(v_capped_line_discount::numeric / v_quantity)::integer;
      v_discount_remainder := v_capped_line_discount % v_quantity;
      -- Distribute +1 to the first v_discount_remainder units.
      v_line_discount_total := (v_discount_amount * v_quantity) + v_discount_remainder;
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


ALTER FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_claim_number"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."generate_claim_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_order_number"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."generate_order_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cart_items"("p_user_id" "uuid", "p_active_only" boolean DEFAULT true) RETURNS SETOF "jsonb"
    LANGUAGE "sql" SECURITY INVOKER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_cart_items"("p_user_id" "uuid", "p_active_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) RETURNS TABLE("id" integer, "code" character varying, "name" character varying, "price" integer, "image" "text", "detailImages" "text"[], "category" character varying, "color" character varying, "pattern" character varying, "material" character varying, "info" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "options" "jsonb", "likes" integer, "isLiked" boolean)
    LANGUAGE "sql" STABLE SECURITY INVOKER
    SET "search_path" TO 'public'
    AS $$
  select
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.detail_images as "detailImages",
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
    ) as options,
    coalesce(lc.likes, 0) as likes,
    coalesce(public.product_is_liked_rpc(p.id), false) as "isLiked"
  from products p
  left join product_options po on po.product_id = p.id
  left join product_like_counts_rpc() lc on lc.product_id = p.id
  where p.id = any (p_ids)
  group by
    p.id,
    p.code,
    p.name,
    p.price,
    p.image,
    p.detail_images,
    p.category,
    p.color,
    p.pattern,
    p.material,
    p.info,
    p.created_at,
    p.updated_at,
    lc.likes
  order by p.id;
$$;


ALTER FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."product_is_liked_rpc"("p_id" integer) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.product_likes pl
    where pl.product_id = p_id
      and pl.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."product_is_liked_rpc"("p_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."product_like_counts_rpc"() RETURNS TABLE("product_id" integer, "likes" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    pl.product_id,
    count(*)::int as likes
  from public.product_likes pl
  group by pl.product_id;
$$;


ALTER FUNCTION "public"."product_like_counts_rpc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_cart_items"("p_user_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."replace_cart_items"("p_user_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cart_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_cart_items_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "item_id" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "product_id" integer,
    "selected_option_id" "text",
    "reform_data" "jsonb",
    "quantity" integer NOT NULL,
    "applied_user_coupon_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['product'::"text", 'reform'::"text"]))),
    CONSTRAINT "cart_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "cart_items_type_check" CHECK (((("item_type" = 'product'::"text") AND ("product_id" IS NOT NULL) AND ("reform_data" IS NULL)) OR (("item_type" = 'reform'::"text") AND ("product_id" IS NULL) AND ("reform_data" IS NOT NULL))))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "claim_number" character varying(50) NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT '접수'::"text" NOT NULL,
    "reason" "text" NOT NULL,
    "description" "text",
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "claims_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "claims_reason_check" CHECK (("reason" = ANY (ARRAY['change_mind'::"text", 'defect'::"text", 'delay'::"text", 'wrong_item'::"text", 'size_mismatch'::"text", 'color_mismatch'::"text", 'other'::"text"]))),
    CONSTRAINT "claims_status_check" CHECK (("status" = ANY (ARRAY['접수'::"text", '처리중'::"text", '완료'::"text", '거부'::"text"]))),
    CONSTRAINT "claims_type_check" CHECK (("type" = ANY (ARRAY['cancel'::"text", 'return'::"text", 'exchange'::"text"])))
);


ALTER TABLE "public"."claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" numeric(10,2) NOT NULL,
    "max_discount_amount" numeric(10,2),
    "description" "text",
    "expiry_date" "date" NOT NULL,
    "additional_info" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "coupons_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "coupons_discount_value_check" CHECK (("discount_value" > (0)::numeric))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "item_id" "text" NOT NULL,
    "item_type" "text" NOT NULL,
    "product_id" integer,
    "selected_option_id" "text",
    "reform_data" "jsonb",
    "quantity" integer NOT NULL,
    "unit_price" integer NOT NULL,
    "discount_amount" integer DEFAULT 0 NOT NULL,
    "applied_user_coupon_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "line_discount_amount" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "order_items_discount_amount_check" CHECK (("discount_amount" >= 0)),
    CONSTRAINT "order_items_item_type_check" CHECK (("item_type" = ANY (ARRAY['product'::"text", 'reform'::"text"]))),
    CONSTRAINT "order_items_item_consistency_check" CHECK (((("item_type" = 'product'::"text") AND ("product_id" IS NOT NULL) AND ("reform_data" IS NULL)) OR (("item_type" = 'reform'::"text") AND ("product_id" IS NULL) AND ("reform_data" IS NOT NULL)))),
    CONSTRAINT "order_items_line_discount_amount_check" CHECK (("line_discount_amount" >= 0)),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_unit_price_check" CHECK (("unit_price" >= 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_number" character varying(50) NOT NULL,
    "shipping_address_id" "uuid" NOT NULL,
    "total_price" integer NOT NULL,
    "original_price" integer NOT NULL,
    "total_discount" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT '대기중'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "orders_original_price_check" CHECK (("original_price" >= 0)),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['대기중'::"text", '진행중'::"text", '배송중'::"text", '완료'::"text", '취소'::"text"]))),
    CONSTRAINT "orders_total_discount_check" CHECK (("total_discount" >= 0)),
    CONSTRAINT "orders_total_price_check" CHECK (("total_price" >= 0))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" integer NOT NULL,
    "option_id" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "additional_price" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" integer NOT NULL,
    "code" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "price" integer NOT NULL,
    "image" "text" NOT NULL,
    "category" character varying(50) NOT NULL,
    "color" character varying(50) NOT NULL,
    "pattern" character varying(50) NOT NULL,
    "material" character varying(50) NOT NULL,
    "info" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "detail_images" "text"[],
    CONSTRAINT "products_category_check" CHECK ((("category")::"text" = ANY (ARRAY[('3fold'::character varying)::"text", ('sfolderato'::character varying)::"text", ('knit'::character varying)::"text", ('bowtie'::character varying)::"text"]))),
    CONSTRAINT "products_color_check" CHECK ((("color")::"text" = ANY (ARRAY[('black'::character varying)::"text", ('navy'::character varying)::"text", ('gray'::character varying)::"text", ('wine'::character varying)::"text", ('blue'::character varying)::"text", ('brown'::character varying)::"text", ('beige'::character varying)::"text", ('silver'::character varying)::"text"]))),
    CONSTRAINT "products_material_check" CHECK ((("material")::"text" = ANY (ARRAY[('silk'::character varying)::"text", ('cotton'::character varying)::"text", ('polyester'::character varying)::"text", ('wool'::character varying)::"text"]))),
    CONSTRAINT "products_pattern_check" CHECK ((("pattern")::"text" = ANY (ARRAY[('solid'::character varying)::"text", ('stripe'::character varying)::"text", ('dot'::character varying)::"text", ('check'::character varying)::"text", ('paisley'::character varying)::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."product_list_view" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."code",
    "p"."name",
    "p"."price",
    "p"."image",
    "p"."detail_images" AS "detailImages",
    "p"."category",
    "p"."color",
    "p"."pattern",
    "p"."material",
    "p"."info",
    "p"."created_at",
    "p"."updated_at",
    COALESCE("jsonb_agg"("jsonb_build_object"('id', "po"."option_id", 'name', "po"."name", 'additionalPrice', "po"."additional_price") ORDER BY "po"."option_id") FILTER (WHERE ("po"."id" IS NOT NULL)), '[]'::"jsonb") AS "options",
    COALESCE("lc"."likes", 0) AS "likes",
    COALESCE("public"."product_is_liked_rpc"("p"."id"), false) AS "isLiked"
   FROM (("public"."products" "p"
     LEFT JOIN "public"."product_options" "po" ON (("po"."product_id" = "p"."id")))
     LEFT JOIN "public"."product_like_counts_rpc"() "lc"("product_id", "likes") ON (("lc"."product_id" = "p"."id")))
  GROUP BY "p"."id", "p"."code", "p"."name", "p"."price", "p"."image", "p"."detail_images", "p"."category", "p"."color", "p"."pattern", "p"."material", "p"."info", "p"."created_at", "p"."updated_at", "lc"."likes";


ALTER TABLE "public"."product_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "coupon_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_coupons_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'used'::"text", 'expired'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."user_coupons" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."claim_list_view" WITH ("security_invoker"='true') AS
 SELECT "cl"."id",
    "cl"."claim_number" AS "claimNumber",
    "to_char"("cl"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "cl"."status",
    "cl"."type",
    "cl"."reason",
    "cl"."description",
    "cl"."quantity" AS "claimQuantity",
    "o"."id" AS "orderId",
    "o"."order_number" AS "orderNumber",
    "to_char"("o"."created_at", 'YYYY-MM-DD'::"text") AS "orderDate",
    "jsonb_build_object"('id', "oi"."item_id", 'type', "oi"."item_type", 'product',
        CASE
            WHEN ("oi"."item_type" = 'product'::"text") THEN "to_jsonb"("p".*)
            ELSE NULL::"jsonb"
        END, 'selectedOption',
        CASE
            WHEN (("oi"."item_type" = 'product'::"text") AND ("oi"."selected_option_id" IS NOT NULL)) THEN ( SELECT "option"."value" AS "option"
               FROM "jsonb_array_elements"(COALESCE(("to_jsonb"("p".*) -> 'options'::"text"), '[]'::"jsonb")) "option"("value")
              WHERE (("option"."value" ->> 'id'::"text") = "oi"."selected_option_id")
             LIMIT 1)
            ELSE NULL::"jsonb"
        END, 'quantity', "oi"."quantity", 'reformData',
        CASE
            WHEN ("oi"."item_type" = 'reform'::"text") THEN "oi"."reform_data"
            ELSE NULL::"jsonb"
        END, 'appliedCoupon', "uc"."user_coupon") AS "item"
   FROM (((("public"."claims" "cl"
     JOIN "public"."orders" "o" ON ((("o"."id" = "cl"."order_id") AND ("o"."user_id" = "auth"."uid"()))))
     JOIN "public"."order_items" "oi" ON (("oi"."id" = "cl"."order_item_id")))
     LEFT JOIN LATERAL ( SELECT "plv"."id",
            "plv"."code",
            "plv"."name",
            "plv"."price",
            "plv"."image",
            "plv"."detailImages",
            "plv"."category",
            "plv"."color",
            "plv"."pattern",
            "plv"."material",
            "plv"."info",
            "plv"."created_at",
            "plv"."updated_at",
            "plv"."options",
            "plv"."likes",
            "plv"."isLiked"
           FROM "public"."product_list_view" "plv"
          WHERE (("oi"."item_type" = 'product'::"text") AND ("oi"."product_id" IS NOT NULL) AND ("plv"."id" = "oi"."product_id"))
         LIMIT 1) "p" ON (true))
     LEFT JOIN LATERAL ( SELECT "uc1"."id",
            "jsonb_build_object"('id', "uc1"."id", 'userId', "uc1"."user_id", 'couponId', "uc1"."coupon_id", 'status', "uc1"."status", 'issuedAt', "uc1"."issued_at", 'expiresAt', "uc1"."expires_at", 'usedAt', "uc1"."used_at", 'coupon', "jsonb_build_object"('id', "cp"."id", 'name', "cp"."name", 'discountType', "cp"."discount_type", 'discountValue', "cp"."discount_value", 'maxDiscountAmount', "cp"."max_discount_amount", 'description', "cp"."description", 'expiryDate', "cp"."expiry_date", 'additionalInfo', "cp"."additional_info")) AS "user_coupon"
           FROM ("public"."user_coupons" "uc1"
             JOIN "public"."coupons" "cp" ON (("cp"."id" = "uc1"."coupon_id")))
          WHERE ("uc1"."id" = "oi"."applied_user_coupon_id")
         LIMIT 1) "uc" ON (true))
  WHERE ("cl"."user_id" = "auth"."uid"());


ALTER TABLE "public"."claim_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_order_fabric_prices" (
    "design_type" "text" NOT NULL,
    "fabric_type" "text" NOT NULL,
    "unit_price" integer NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "custom_order_fabric_prices_design_type_check" CHECK (("design_type" = ANY (ARRAY['YARN_DYED'::"text", 'PRINTING'::"text"]))),
    CONSTRAINT "custom_order_fabric_prices_fabric_type_check" CHECK (("fabric_type" = ANY (ARRAY['SILK'::"text", 'POLY'::"text"]))),
    CONSTRAINT "custom_order_fabric_prices_unit_price_check" CHECK (("unit_price" >= 0))
);


ALTER TABLE "public"."custom_order_fabric_prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_order_pricing_constants" (
    "key" "text" NOT NULL,
    "amount" integer NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "custom_order_pricing_constants_amount_check" CHECK (("amount" >= 0))
);


ALTER TABLE "public"."custom_order_pricing_constants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "status" "text" DEFAULT '답변대기'::"text" NOT NULL,
    "answer" "text",
    "answer_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inquiries_content_check" CHECK (("char_length"("content") > 0)),
    CONSTRAINT "inquiries_status_check" CHECK (("status" = ANY (ARRAY['답변대기'::"text", '답변완료'::"text"]))),
    CONSTRAINT "inquiries_title_check" CHECK (("char_length"("title") > 0))
);


ALTER TABLE "public"."inquiries" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_item_view" WITH ("security_invoker"='true') AS
 SELECT "oi"."order_id",
    "oi"."created_at",
    "oi"."item_id" AS "id",
    "oi"."item_type" AS "type",
        CASE
            WHEN ("oi"."item_type" = 'product'::"text") THEN "to_jsonb"("p".*)
            ELSE NULL::"jsonb"
        END AS "product",
        CASE
            WHEN (("oi"."item_type" = 'product'::"text") AND ("oi"."selected_option_id" IS NOT NULL)) THEN ( SELECT "option"."value" AS "option"
               FROM "jsonb_array_elements"(COALESCE(("to_jsonb"("p".*) -> 'options'::"text"), '[]'::"jsonb")) "option"("value")
              WHERE (("option"."value" ->> 'id'::"text") = "oi"."selected_option_id")
             LIMIT 1)
            ELSE NULL::"jsonb"
        END AS "selectedOption",
    "oi"."quantity",
        CASE
            WHEN ("oi"."item_type" = 'reform'::"text") THEN "oi"."reform_data"
            ELSE NULL::"jsonb"
        END AS "reformData",
    "uc"."user_coupon" AS "appliedCoupon"
   FROM ((("public"."order_items" "oi"
     JOIN "public"."orders" "o" ON ((("o"."id" = "oi"."order_id") AND ("o"."user_id" = "auth"."uid"()))))
     LEFT JOIN LATERAL ( SELECT "plv"."id",
            "plv"."code",
            "plv"."name",
            "plv"."price",
            "plv"."image",
            "plv"."detailImages",
            "plv"."category",
            "plv"."color",
            "plv"."pattern",
            "plv"."material",
            "plv"."info",
            "plv"."created_at",
            "plv"."updated_at",
            "plv"."options",
            "plv"."likes",
            "plv"."isLiked"
           FROM "public"."product_list_view" "plv"
          WHERE (("oi"."item_type" = 'product'::"text") AND ("oi"."product_id" IS NOT NULL) AND ("plv"."id" = "oi"."product_id"))
         LIMIT 1) "p" ON (true))
     LEFT JOIN LATERAL ( SELECT "uc1"."id",
            "jsonb_build_object"('id', "uc1"."id", 'userId', "uc1"."user_id", 'couponId', "uc1"."coupon_id", 'status', "uc1"."status", 'issuedAt', "uc1"."issued_at", 'expiresAt', "uc1"."expires_at", 'usedAt', "uc1"."used_at", 'coupon', "jsonb_build_object"('id', "c"."id", 'name', "c"."name", 'discountType', "c"."discount_type", 'discountValue', "c"."discount_value", 'maxDiscountAmount', "c"."max_discount_amount", 'description', "c"."description", 'expiryDate', "c"."expiry_date", 'additionalInfo', "c"."additional_info")) AS "user_coupon"
           FROM ("public"."user_coupons" "uc1"
             JOIN "public"."coupons" "c" ON (("c"."id" = "uc1"."coupon_id")))
          WHERE ("uc1"."id" = "oi"."applied_user_coupon_id")
         LIMIT 1) "uc" ON (true));


ALTER TABLE "public"."order_item_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_list_view" WITH ("security_invoker"='true') AS
 SELECT "o"."id",
    "o"."order_number" AS "orderNumber",
    "to_char"("o"."created_at", 'YYYY-MM-DD'::"text") AS "date",
    "o"."status",
    "o"."total_price" AS "totalPrice",
    "o"."created_at"
   FROM "public"."orders" "o"
  WHERE ("o"."user_id" = "auth"."uid"());


ALTER TABLE "public"."order_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_likes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."products_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."products_id_seq" OWNED BY "public"."products"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying NOT NULL,
    "phone" character varying,
    "role" "public"."user_role" DEFAULT 'customer'::"public"."user_role" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "birth" "date"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipping_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipient_name" character varying NOT NULL,
    "recipient_phone" character varying NOT NULL,
    "address" "text" NOT NULL,
    "is_default" boolean NOT NULL,
    "user_id" "uuid" NOT NULL,
    "postal_code" character varying NOT NULL,
    "delivery_memo" "text",
    "address_detail" character varying,
    "delivery_request" "text"
);


ALTER TABLE "public"."shipping_addresses" OWNER TO "postgres";


ALTER TABLE ONLY "public"."products" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."products_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_unique_user_item" UNIQUE ("user_id", "item_id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_claim_number_key" UNIQUE ("claim_number");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_order_fabric_prices"
    ADD CONSTRAINT "custom_order_fabric_prices_pkey" PRIMARY KEY ("design_type", "fabric_type");



ALTER TABLE ONLY "public"."custom_order_pricing_constants"
    ADD CONSTRAINT "custom_order_pricing_constants_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_likes"
    ADD CONSTRAINT "product_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_likes"
    ADD CONSTRAINT "product_likes_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_product_id_option_id_key" UNIQUE ("product_id", "option_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipping_addresses"
    ADD CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_coupons"
    ADD CONSTRAINT "user_coupons_pkey" PRIMARY KEY ("id");



CREATE INDEX "coupons_active_idx" ON "public"."coupons" USING "btree" ("is_active");



CREATE INDEX "coupons_expiry_idx" ON "public"."coupons" USING "btree" ("expiry_date");



CREATE INDEX "idx_cart_items_created_at" ON "public"."cart_items" USING "btree" ("created_at");



CREATE INDEX "idx_cart_items_product_id" ON "public"."cart_items" USING "btree" ("product_id") WHERE ("product_id" IS NOT NULL);



CREATE INDEX "idx_cart_items_user_id" ON "public"."cart_items" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_claims_active_per_item" ON "public"."claims" USING "btree" ("order_item_id", "type") WHERE ("status" = ANY (ARRAY['접수'::"text", '처리중'::"text"]));



CREATE INDEX "idx_claims_order_id" ON "public"."claims" USING "btree" ("order_id");



CREATE INDEX "idx_claims_order_item_id" ON "public"."claims" USING "btree" ("order_item_id");



CREATE INDEX "idx_claims_status" ON "public"."claims" USING "btree" ("status");



CREATE INDEX "idx_claims_user_id" ON "public"."claims" USING "btree" ("user_id");



CREATE INDEX "idx_inquiries_status" ON "public"."inquiries" USING "btree" ("status");



CREATE INDEX "idx_inquiries_user_id" ON "public"."inquiries" USING "btree" ("user_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_orders_order_number" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_product_likes_product_id" ON "public"."product_likes" USING "btree" ("product_id");



CREATE INDEX "idx_product_likes_user_id" ON "public"."product_likes" USING "btree" ("user_id");



CREATE INDEX "idx_product_options_product_id" ON "public"."product_options" USING "btree" ("product_id");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category");



CREATE INDEX "idx_products_color" ON "public"."products" USING "btree" ("color");



CREATE INDEX "idx_products_material" ON "public"."products" USING "btree" ("material");



CREATE INDEX "idx_products_pattern" ON "public"."products" USING "btree" ("pattern");



CREATE INDEX "idx_products_price" ON "public"."products" USING "btree" ("price");



CREATE INDEX "user_coupons_expires_idx" ON "public"."user_coupons" USING "btree" ("expires_at");



CREATE INDEX "user_coupons_status_idx" ON "public"."user_coupons" USING "btree" ("status");



CREATE INDEX "user_coupons_user_id_idx" ON "public"."user_coupons" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "cart_items_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_cart_items_updated_at"();



CREATE OR REPLACE TRIGGER "coupons_set_updated_at" BEFORE UPDATE ON "public"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_claims_updated_at" BEFORE UPDATE ON "public"."claims" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_inquiries_updated_at" BEFORE UPDATE ON "public"."inquiries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "user_coupons_set_updated_at" BEFORE UPDATE ON "public"."user_coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_applied_user_coupon_id_fkey" FOREIGN KEY ("applied_user_coupon_id") REFERENCES "public"."user_coupons"("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_applied_user_coupon_id_fkey" FOREIGN KEY ("applied_user_coupon_id") REFERENCES "public"."user_coupons"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_price_check" CHECK (("price" >= 0));



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."shipping_addresses"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_likes"
    ADD CONSTRAINT "product_likes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_likes"
    ADD CONSTRAINT "product_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shipping_addresses"
    ADD CONSTRAINT "shipping_addresses_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_coupons"
    ADD CONSTRAINT "user_coupons_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id");



ALTER TABLE ONLY "public"."user_coupons"
    ADD CONSTRAINT "user_coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Allow public read access to product_options" ON "public"."product_options" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to products" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "Allow read access to coupons" ON "public"."coupons" FOR SELECT USING (true);



CREATE POLICY "Allow service role full access to coupons" ON "public"."coupons" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."shipping_addresses" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."shipping_addresses" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable update for users based on user_id" ON "public"."shipping_addresses" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."shipping_addresses" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can create their own claims" ON "public"."claims" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own inquiries" ON "public"."inquiries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own order items" ON "public"."order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own orders" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own cart items" ON "public"."cart_items" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own likes" ON "public"."product_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own pending inquiries" ON "public"."inquiries" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("status" = '답변대기'::"text")));



CREATE POLICY "Users can insert their own cart items" ON "public"."cart_items" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own likes" ON "public"."product_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own cart items" ON "public"."cart_items" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own pending inquiries" ON "public"."inquiries" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("status" = '답변대기'::"text"))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = '답변대기'::"text") AND ("answer" IS NULL)));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK ((("auth"."uid"() = "id") AND ("role"::"text" = 'customer'::"text") AND ("is_active" = true)));



CREATE POLICY "Users can view their own cart items" ON "public"."cart_items" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own claims" ON "public"."claims" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own inquiries" ON "public"."inquiries" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own likes" ON "public"."product_likes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own order items" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own orders" ON "public"."orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_order_fabric_prices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_order_fabric_prices_service_role_only" ON "public"."custom_order_fabric_prices" AS RESTRICTIVE TO "service_role", "postgres" USING (true) WITH CHECK (true);



ALTER TABLE "public"."custom_order_pricing_constants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_order_pricing_constants_service_role_only" ON "public"."custom_order_pricing_constants" AS RESTRICTIVE TO "service_role", "postgres" USING (true) WITH CHECK (true);



ALTER TABLE "public"."inquiries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipping_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_coupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_coupons_select_own" ON "public"."user_coupons" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_coupons_service_all" ON "public"."user_coupons" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































REVOKE ALL ON FUNCTION "public"."calculate_custom_order_amounts"("p_options" "jsonb", "p_quantity" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_custom_order_amounts"("p_options" "jsonb", "p_quantity" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text", "p_quantity" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_claim"("p_type" "text", "p_order_id" "uuid", "p_item_id" "text", "p_reason" "text", "p_description" "text", "p_quantity" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_sample" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_sample" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_custom_order_txn"("p_shipping_address_id" "uuid", "p_options" "jsonb", "p_quantity" integer, "p_reference_image_urls" "text"[], "p_additional_notes" "text", "p_sample" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_txn"("p_shipping_address_id" "uuid", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_claim_number"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_claim_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_claim_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_claim_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cart_items"("p_user_id" "uuid", "p_active_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_cart_items"("p_user_id" "uuid", "p_active_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cart_items"("p_user_id" "uuid", "p_active_only" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_by_ids"("p_ids" integer[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."product_is_liked_rpc"("p_id" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."product_is_liked_rpc"("p_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."product_is_liked_rpc"("p_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."product_is_liked_rpc"("p_id" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."product_like_counts_rpc"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."product_like_counts_rpc"() TO "anon";
GRANT ALL ON FUNCTION "public"."product_like_counts_rpc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."product_like_counts_rpc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."replace_cart_items"("p_user_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."replace_cart_items"("p_user_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_cart_items"("p_user_id" "uuid", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cart_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cart_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cart_items_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT SELECT ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."claims" TO "service_role";
GRANT SELECT,REFERENCES ON TABLE "public"."claims" TO "anon";
GRANT SELECT,REFERENCES ON TABLE "public"."claims" TO "authenticated";



GRANT SELECT ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT SELECT ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT SELECT ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT SELECT ON TABLE "public"."product_options" TO "anon";
GRANT ALL ON TABLE "public"."product_options" TO "authenticated";
GRANT ALL ON TABLE "public"."product_options" TO "service_role";



GRANT SELECT ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."product_list_view" TO "anon";
GRANT ALL ON TABLE "public"."product_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."product_list_view" TO "service_role";



GRANT SELECT ON TABLE "public"."user_coupons" TO "anon";
GRANT ALL ON TABLE "public"."user_coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."user_coupons" TO "service_role";



GRANT ALL ON TABLE "public"."claim_list_view" TO "anon";
GRANT ALL ON TABLE "public"."claim_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_list_view" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."custom_order_fabric_prices" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."custom_order_pricing_constants" TO "service_role";



GRANT SELECT ON TABLE "public"."inquiries" TO "anon";
GRANT ALL ON TABLE "public"."inquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."inquiries" TO "service_role";



GRANT ALL ON TABLE "public"."order_item_view" TO "anon";
GRANT ALL ON TABLE "public"."order_item_view" TO "authenticated";
GRANT ALL ON TABLE "public"."order_item_view" TO "service_role";



GRANT ALL ON TABLE "public"."order_list_view" TO "anon";
GRANT ALL ON TABLE "public"."order_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."order_list_view" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_likes" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."product_likes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT SELECT ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT ON TABLE "public"."shipping_addresses" TO "anon";
GRANT ALL ON TABLE "public"."shipping_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."shipping_addresses" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";































--
-- Dumped schema changes for auth and storage
--

