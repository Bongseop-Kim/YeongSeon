-- =============================================================
-- 코드 리뷰 버그픽스 (3건)
--
-- 1. replace_cart_items: 동시 호출 인터리빙 방지용 advisory lock 추가
-- 2. user_coupons: 'reserved' 상태 추가 + 쿠폰 소비 시점을 결제 확정으로 이동
--    - create_order_txn: 'used' → 'reserved' (주문 생성 시 예약만)
--    - confirm_payment_orders: 'reserved' → 'used' (결제 확정 시 소비)
--    - unlock_payment_orders: 'reserved' → 'active' (결제 실패 시 복원)
-- 3. create_custom_order_txn: order_items.quantity 하드코딩 1 → p_quantity,
--    unit_price를 총액 대신 단가(floor(total/qty))로 수정
-- =============================================================

-- ── 1. user_coupons 상태 체크 제약 확장 ───────────────────────
ALTER TABLE public.user_coupons
  DROP CONSTRAINT user_coupons_status_check,
  ADD CONSTRAINT user_coupons_status_check
    CHECK (status = ANY (ARRAY['active','used','expired','revoked','reserved']));

-- ── 2. replace_cart_items (advisory lock) ────────────────────
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

  -- 동일 유저의 동시 replace_cart_items 호출을 직렬화하여 DELETE+INSERT 인터리빙 방지
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text)::bigint);

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

-- ── 3. create_order_txn (쿠폰 'reserved' 예약으로 변경) ───────
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
  v_capped_line_discount integer;
  v_discount_remainder integer;
  v_option_additional_price integer;
  v_line_discount_total integer;
  v_product_stock integer;
  v_option_stock integer;

  v_original_price integer := 0;
  v_total_discount integer := 0;
  v_total_price integer := 0;
  v_reform_base_cost integer;
  v_reform_shipping_cost integer;
  v_used_coupon_ids uuid[] := '{}'::uuid[];
  v_coupon record;
  v_order_type text;

  v_payment_group_id uuid;
  v_group_total_amount integer := 0;
  v_orders_result jsonb := '[]'::jsonb;
  v_product_items jsonb := '[]'::jsonb;
  v_reform_items jsonb := '[]'::jsonb;
  v_product_original integer := 0;
  v_product_discount integer := 0;
  v_reform_original integer := 0;
  v_reform_discount integer := 0;
  v_shipping_cost integer;
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

      select p.price, p.stock
      into v_unit_price, v_product_stock
      from products p
      where p.id = v_product_id
      for update;

      if not found then
        raise exception 'Product not found';
      end if;

      if v_selected_option_id is not null then
        select coalesce(po.additional_price, 0), po.stock
        into v_option_additional_price, v_option_stock
        from product_options po
        where po.product_id = v_product_id
          and po.id::text = v_selected_option_id
        for update;

        if not found then
          raise exception 'Selected option not found';
        end if;

        -- Check option stock
        if v_option_stock is not null then
          if v_option_stock < v_quantity then
            raise exception 'Insufficient stock for option';
          end if;
          update product_options
          set stock = stock - v_quantity
          where product_id = v_product_id
            and id::text = v_selected_option_id;
        end if;
      else
        -- No option selected: check product-level stock
        if v_product_stock is not null then
          if v_product_stock < v_quantity then
            raise exception 'Insufficient stock';
          end if;
          update products
          set stock = stock - v_quantity
          where id = v_product_id;
        end if;
      end if;

      v_unit_price := v_unit_price + v_option_additional_price;
    elsif v_item_type = 'reform' then
      v_product_id := null;
      v_selected_option_id := null;
      v_reform_data := v_item->'reform_data';

      -- reform 아이템이 실제로 있을 때만 pricing constants 조회 (최초 1회)
      if v_reform_base_cost is null then
        SELECT amount INTO v_reform_base_cost
        FROM custom_order_pricing_constants WHERE key = 'REFORM_BASE_COST';
        IF v_reform_base_cost IS NULL THEN
          RAISE EXCEPTION 'Missing pricing constant: REFORM_BASE_COST';
        END IF;

        SELECT amount INTO v_reform_shipping_cost
        FROM custom_order_pricing_constants WHERE key = 'REFORM_SHIPPING_COST';
        IF v_reform_shipping_cost IS NULL THEN
          RAISE EXCEPTION 'Missing pricing constant: REFORM_SHIPPING_COST';
        END IF;
      end if;

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

  -- 아이템 타입별 분류 및 소계 계산
  v_payment_group_id := gen_random_uuid();

  for v_item in select * from jsonb_array_elements(v_normalized_items)
  loop
    if v_item->>'item_type' = 'product' then
      v_product_items := v_product_items || jsonb_build_array(v_item);
      v_product_original := v_product_original
        + (v_item->>'unit_price')::integer * (v_item->>'quantity')::integer;
      v_product_discount := v_product_discount
        + coalesce((v_item->>'line_discount_amount')::integer, 0);
    elsif v_item->>'item_type' = 'reform' then
      v_reform_items := v_reform_items || jsonb_build_array(v_item);
      v_reform_original := v_reform_original
        + (v_item->>'unit_price')::integer * (v_item->>'quantity')::integer;
      v_reform_discount := v_reform_discount
        + coalesce((v_item->>'line_discount_amount')::integer, 0);
    end if;
  end loop;

  -- product 주문 생성 (shipping_cost=0)
  if jsonb_array_length(v_product_items) > 0 then
    v_order_number := generate_order_number();
    v_total_price := v_product_original - v_product_discount;

    insert into orders (
      user_id, order_number, shipping_address_id,
      total_price, original_price, total_discount,
      order_type, status, payment_group_id, shipping_cost
    )
    values (
      v_user_id, v_order_number, p_shipping_address_id,
      v_total_price, v_product_original, v_product_discount,
      'sale', '대기중', v_payment_group_id, 0
    )
    returning id into v_order_id;

    for v_item in select * from jsonb_array_elements(v_product_items)
    loop
      insert into order_items (
        order_id, item_id, item_type, product_id,
        selected_option_id, reform_data, quantity,
        unit_price, discount_amount, line_discount_amount,
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

    v_group_total_amount := v_group_total_amount + v_total_price;
    v_orders_result := v_orders_result || jsonb_build_array(
      jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'order_type', 'sale'
      )
    );
  end if;

  -- repair 주문 생성 (shipping_cost=v_reform_shipping_cost)
  if jsonb_array_length(v_reform_items) > 0 then
    v_order_number := generate_order_number();
    v_shipping_cost := v_reform_shipping_cost;
    v_total_price := v_reform_original - v_reform_discount + v_shipping_cost;

    insert into orders (
      user_id, order_number, shipping_address_id,
      total_price, original_price, total_discount,
      order_type, status, payment_group_id, shipping_cost
    )
    values (
      v_user_id, v_order_number, p_shipping_address_id,
      v_total_price, v_reform_original, v_reform_discount,
      'repair', '대기중', v_payment_group_id, v_shipping_cost
    )
    returning id into v_order_id;

    for v_item in select * from jsonb_array_elements(v_reform_items)
    loop
      insert into order_items (
        order_id, item_id, item_type, product_id,
        selected_option_id, reform_data, quantity,
        unit_price, discount_amount, line_discount_amount,
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

    v_group_total_amount := v_group_total_amount + v_total_price;
    v_orders_result := v_orders_result || jsonb_build_array(
      jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'order_type', 'repair'
      )
    );
  end if;

  -- 쿠폰을 즉시 'used'로 마킹하지 않고 'reserved'로 예약.
  -- 결제 확정(confirm_payment_orders) 시 'used'로 전환,
  -- 결제 실패(unlock_payment_orders) 시 'active'로 복원.
  if array_length(v_used_coupon_ids, 1) is not null then
    update user_coupons
    set status = 'reserved',
        updated_at = now()
    where user_id = v_user_id
      and status = 'active'
      and id = any(v_used_coupon_ids);
  end if;

  return jsonb_build_object(
    'payment_group_id', v_payment_group_id,
    'total_amount', v_group_total_amount,
    'orders', v_orders_result
  );
end;
$$;

-- ── 4. confirm_payment_orders (쿠폰 확정) ────────────────────
CREATE OR REPLACE FUNCTION public.confirm_payment_orders(
  p_payment_group_id uuid,
  p_user_id uuid,
  p_payment_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- order_status_logs INSERT에 일반 유저 RLS 없음
SET search_path TO 'public'
AS $$
declare
  v_order record;
  v_post_status text;
  v_updated_orders jsonb := '[]'::jsonb;
  v_count int := 0;
  v_masked_key text;
begin
  -- p_user_id NULL 이면 호출자 신원 불명 → 즉시 거부
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  -- service role 경유(Edge Function) 시 auth.uid() = null → skip
  -- 직접 RPC 호출 시 호출자 신원 검증 (IS DISTINCT FROM: NULL 안전 비교)
  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  -- payment_key 마스킹: 끝 8자리만 유지, 나머지 ****
  v_masked_key := case
    when length(p_payment_key) <= 8 then '****'
    else '****' || right(p_payment_key, 8)
  end;

  for v_order in
    select id, user_id, status, order_type
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    -- IS DISTINCT FROM: p_user_id가 NULL이어도 안전하게 비교
    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status != '결제중' then
      raise exception 'Order % is not payable (status: %)', v_order.id, v_order.status;
    end if;

    v_post_status := case v_order.order_type
      when 'sale' then '진행중'
      else '접수'
    end;

    update public.orders
    set status = v_post_status, updated_at = now()
    where id = v_order.id;

    insert into public.order_status_logs (
      order_id, changed_by, previous_status, new_status, memo
    ) values (
      v_order.id, p_user_id, v_order.status, v_post_status,
      'payment confirmed: ' || v_masked_key
    );

    v_updated_orders := v_updated_orders || jsonb_build_object(
      'orderId', v_order.id,
      'orderType', v_order.order_type
    );
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  -- 결제 확정 후 예약된 쿠폰을 사용 처리
  update public.user_coupons
  set status = 'used',
      used_at = now(),
      updated_at = now()
  where user_id = p_user_id
    and status = 'reserved'
    and id in (
      select distinct oi.applied_user_coupon_id
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.payment_group_id = p_payment_group_id
        and oi.applied_user_coupon_id is not null
    );

  return jsonb_build_object(
    'success', true,
    'orders', v_updated_orders
  );
end;
$$;

-- ── 5. unlock_payment_orders (쿠폰 복원) ─────────────────────
CREATE OR REPLACE FUNCTION public.unlock_payment_orders(
  p_payment_group_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order record;
  v_count int := 0;
begin
  -- p_user_id NULL 이면 호출자 신원 불명 → 즉시 거부
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  -- service role 경유(Edge Function) 시 auth.uid() = null → skip
  -- 직접 RPC 호출 시 호출자 신원 검증 (IS DISTINCT FROM: NULL 안전 비교)
  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

  for v_order in
    select id, user_id, status
    from public.orders
    where payment_group_id = p_payment_group_id
    for update
  loop
    v_count := v_count + 1;

    -- IS DISTINCT FROM: p_user_id가 NULL이어도 안전하게 비교
    if v_order.user_id is distinct from p_user_id then
      raise exception 'Forbidden: order % not owned by user', v_order.id;
    end if;

    if v_order.status = '결제중' then
      update public.orders
      set status = '대기중', updated_at = now()
      where id = v_order.id;

      insert into public.order_status_logs (
        order_id, changed_by, previous_status, new_status, memo
      ) values (
        v_order.id, p_user_id, '결제중', '대기중', 'payment unlock: approval failed'
      );

    elsif v_order.status = '대기중' then
      -- 멱등: 이미 대기중
      null;

    elsif v_order.status in ('진행중', '접수') then
      -- 다른 경로로 이미 confirm됨 — skip
      null;

    end if;
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  -- 결제 실패 시 예약된 쿠폰을 활성 상태로 복원
  update public.user_coupons
  set status = 'active',
      updated_at = now()
  where user_id = p_user_id
    and status = 'reserved'
    and id in (
      select distinct oi.applied_user_coupon_id
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.payment_group_id = p_payment_group_id
        and oi.applied_user_coupon_id is not null
    );

  return jsonb_build_object('success', true);
end;
$$;

-- unlock_payment_orders: service_role 전용 (권한 재설정)
REVOKE EXECUTE ON FUNCTION public.unlock_payment_orders(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_payment_orders(uuid, uuid) TO service_role;

-- ── 6. create_custom_order_txn (quantity 및 unit_price 수정) ─
CREATE OR REPLACE FUNCTION public.create_custom_order_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_image_urls text[] DEFAULT '{}'::text[],
  p_additional_notes text DEFAULT '',
  p_sample boolean DEFAULT false,
  p_sample_type text DEFAULT null
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

  -- p_sample / p_sample_type 정합성 검증
  if p_sample is not true and p_sample_type is not null then
    raise exception 'p_sample_type must be null when p_sample is not true';
  end if;

  if p_sample is true and (p_sample_type is null or trim(p_sample_type) = '') then
    raise exception 'p_sample_type is required when p_sample is true';
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
    order_type,
    status
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_cost,
    v_total_cost,
    0,
    'custom',
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
    'sample_type', p_sample_type,
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
    p_quantity,
    floor(v_total_cost::numeric / p_quantity)::integer,
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
