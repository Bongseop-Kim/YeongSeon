-- ============================================================= 
-- 93_functions_orders.sql  – Order lifecycle RPC functions 
-- =============================================================
-- ── create_order_txn ─────────────────────────────────────────
-- SECURITY DEFINER: 일반 유저는 orders, order_items, user_coupons 테이블에
--   직접 INSERT/UPDATE RLS 정책이 없다. 이 함수가 해당 테이블에 원자적으로
--   쓰기 위해 SECURITY DEFINER가 필요하다.
--   소유권 보호:
--     - auth.uid() null 체크로 미인증 호출 차단
--     - shipping_addresses는 user_id = auth.uid() 소유권 검증
--     - user_coupons 업데이트 시 WHERE user_id = v_user_id 조건 적용
--   완화 조치: SET search_path TO 'public'으로 검색 경로 고정,
--     입력값 유효성 검사(수량, 아이템 타입 등) 포함.
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

-- ── customer_confirm_purchase ─────────────────────────────────
-- Allows a customer to manually confirm purchase after delivery.
-- Earns 2% points. Callable when status = '배송완료' or '배송중'.
-- SECURITY DEFINER 사용 근거:
--   이 함수는 authenticated 사용자(고객)가 호출하지만, 세 테이블에 직접 쓰기가 필요하다:
--     - public.orders        : UPDATE (RLS에 INSERT/UPDATE 정책 없음)
--     - public.points        : INSERT (RLS에 고객용 INSERT 정책 없음)
--     - public.order_status_logs : INSERT (RLS에 INSERT 정책 없음)
--   SECURITY INVOKER + RLS 조합으로는 위 테이블에 쓸 수 없어 SECURITY DEFINER가 필요하다.
--   SET ROLE 방식은 Supabase 환경에서 사용할 수 없다.
--   권한 상승 방지를 위한 안전 장치:
--     1) auth.uid() 검증으로 미인증 호출 즉시 차단
--     2) FOR UPDATE로 주문 소유권(user_id = auth.uid()) 검증
--     3) 상태 체크로 허용된 전이만 수행
--     4) 입력값은 p_order_id(uuid) 하나뿐이며 SQL 인젝션 표면이 없음
CREATE OR REPLACE FUNCTION public.customer_confirm_purchase(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id        uuid;
  v_current_status text;
  v_total_price    integer;
  v_points_earned  integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Lock the row and verify ownership + status
  select o.status, o.total_price
  into v_current_status, v_total_price
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found or access denied';
  end if;

  if v_current_status not in ('배송완료', '배송중') then
    raise exception '구매확정은 배송중 또는 배송완료 상태에서만 가능합니다 (현재: %)', v_current_status;
  end if;

  if exists (
    select 1
    from public.claims c
    join public.order_items oi on oi.id = c.order_item_id
    where oi.order_id = p_order_id
      and c.status in ('접수', '처리중', '수거요청', '수거완료', '재발송')
  ) then
    raise exception '진행 중인 클레임이 있는 주문은 구매확정할 수 없습니다';
  end if;

  -- Earn 2% points for manual confirmation
  v_points_earned := floor(v_total_price * 0.02);

  update public.orders
  set status       = '완료',
      confirmed_at = now()
  where id = p_order_id;

  if v_points_earned > 0 then
    insert into public.points (user_id, order_id, amount, type, description)
    values (
      v_user_id,
      p_order_id,
      v_points_earned,
      'earn',
      '구매확정 포인트 적립 (직접 확정, 2%)'
    );
  end if;

  -- Audit log (changed_by = customer uid)
  insert into public.order_status_logs (
    order_id,
    changed_by,
    previous_status,
    new_status,
    memo
  )
  values (
    p_order_id,
    v_user_id,
    v_current_status,
    '완료',
    '고객 직접 구매확정'
  );

  return jsonb_build_object(
    'success', true,
    'points_earned', v_points_earned
  );
end;
$$;


-- ── auto_confirm_delivered_orders ────────────────────────────
-- Called by pg_cron daily at 03:00 KST.
-- Confirms orders in '배송완료' (7+ days since delivered_at) and
-- '배송중' (7+ days since shipped_at).
-- Earns 0.5% points for auto-confirmed orders.
-- SECURITY DEFINER 사용 근거:
--   pg_cron 또는 service_role에 의해서만 호출되는 스케줄러 함수로, 세 테이블에 직접 쓰기가 필요하다:
--     - public.orders        : UPDATE (status → '완료', confirmed_at 갱신)
--     - public.points        : INSERT (자동확정 포인트 적립)
--     - public.order_status_logs : INSERT (감사 로그)
--   SECURITY INVOKER로는 스케줄러 실행 컨텍스트에서 위 테이블에 쓸 수 없어 SECURITY DEFINER가 필요하다.
--   권한 남용 방지를 위한 안전 장치:
--     - current_setting('request.jwt.claim.role') 검사로 service_role 또는 pg_cron(JWT 없음 → '')만 허용
--     - '': pg_cron은 JWT 없이 DB 레벨에서 직접 호출하므로 coalesce(NULL, '') = ''이 됨 (의도된 허용)
--           이 경우 보안은 DB 접근 제어(네트워크/역할 권한)에 의존하며, 외부 HTTP 경유 호출 불가
--     - FOR UPDATE SKIP LOCKED로 동시 중복 처리 방지
CREATE OR REPLACE FUNCTION public.auto_confirm_delivered_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order  record;
  v_points integer;
  v_count  integer := 0;
begin
  -- pg_cron 또는 service_role 호출만 허용
  -- ''는 pg_cron 전용: pg_cron은 JWT 없이 DB 레벨에서 실행되므로 role claim이 NULL → ''로 평가됨
  -- HTTP를 통한 외부 호출은 반드시 JWT를 포함하므로 ''로 도달할 수 없음
  if coalesce(current_setting('request.jwt.claim.role', true), '') not in ('', 'service_role') then
    raise exception 'unauthorized: scheduler-only function';
  end if;

  for v_order in
    select id, user_id, total_price, status
    from public.orders
    where (
      (status = '배송완료' and delivered_at <= now() - interval '7 days')
      or
      (status = '배송중' and shipped_at <= now() - interval '7 days')
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
    v_points := floor(v_order.total_price * 0.005);

    update public.orders
    set status       = '완료',
        confirmed_at = now()
    where id = v_order.id;

    if v_points > 0 then
      insert into public.points (user_id, order_id, amount, type, description)
      values (
        v_order.user_id,
        v_order.id,
        v_points,
        'earn',
        '구매확정 포인트 적립 (자동 확정, 0.5%)'
      );
    end if;

    -- Audit log (changed_by = NULL indicates automated system action)
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
