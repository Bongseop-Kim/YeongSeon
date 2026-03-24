-- =============================================================
-- 20260331000000_fix_db_lint_issues.sql
-- supabase db lint 오류/경고 일괄 수정
--
-- error 4개:
--   1. create_quote_request_txn  : quote_requests.reference_image_urls → reference_images
--   2. create_custom_order_txn   : order_items.reform_data → item_data
--   3. manage_design_tokens_admin: design_tokens.expires_at 컬럼 참조 제거
--   4. confirm_payment_orders    : ON CONFLICT partial index 조건(WHERE work_id IS NOT NULL) 누락
-- warning 2개:
--   5. create_order_txn          : 미사용 변수 v_order_type 제거
--   6. admin_update_order_status : 미사용 변수 v_total_price 제거
-- =============================================================

-- ── 1. create_quote_request_txn ──────────────────────────────
-- squash 버전: p_reference_image_urls text[], quote_requests.reference_image_urls INSERT
-- 현재 테이블 : reference_images jsonb 컬럼
DROP FUNCTION IF EXISTS public.create_quote_request_txn(uuid, jsonb, integer, text[], text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_quote_request_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_images jsonb DEFAULT '[]'::jsonb,
  p_additional_notes text DEFAULT '',
  p_contact_name text DEFAULT '',
  p_contact_title text DEFAULT '',
  p_contact_method text DEFAULT 'phone',
  p_contact_value text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_quote_id uuid;
  v_quote_number text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Quantity validation
  if p_quantity is null or p_quantity < 100 then
    raise exception 'Quantity must be 100 or more';
  end if;

  -- Shipping address validation
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

  -- Contact field validation
  if p_contact_name is null or trim(p_contact_name) = '' then
    raise exception 'Contact name is required';
  end if;

  if p_contact_method is null or p_contact_method not in ('email', 'kakao', 'phone') then
    raise exception 'Invalid contact method';
  end if;

  if p_contact_value is null or trim(p_contact_value) = '' then
    raise exception 'Contact value is required';
  end if;

  -- Options validation
  if p_options is null or jsonb_typeof(p_options) <> 'object' then
    raise exception 'Invalid options payload';
  end if;

  v_quote_number := public.generate_quote_number();

  insert into public.quote_requests (
    user_id,
    quote_number,
    shipping_address_id,
    options,
    quantity,
    reference_images,
    additional_notes,
    contact_name,
    contact_title,
    contact_method,
    contact_value,
    status
  )
  values (
    v_user_id,
    v_quote_number,
    p_shipping_address_id,
    p_options,
    p_quantity,
    coalesce(p_reference_images, '[]'::jsonb),
    coalesce(p_additional_notes, ''),
    trim(p_contact_name),
    coalesce(trim(p_contact_title), ''),
    p_contact_method,
    trim(p_contact_value),
    '요청'
  )
  returning id into v_quote_id;

  -- images 테이블에 참조 이미지 등록
  -- SECURITY DEFINER이므로 RLS bypass. RPC 내부에서 이미 v_user_id := auth.uid() 소유권 검증 완료.
  IF p_reference_images IS NOT NULL AND jsonb_array_length(p_reference_images) > 0 THEN
    INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
    SELECT
      elem->>'url',
      nullif(elem->>'file_id', ''),
      '/custom-orders',
      'quote_request',
      v_quote_id::text,
      v_user_id
    FROM jsonb_array_elements(p_reference_images) AS elem;
  END IF;

  return jsonb_build_object(
    'quote_request_id', v_quote_id,
    'quote_number', v_quote_number
  );
end;
$$;

-- ── 2. create_custom_order_txn ────────────────────────────────
-- squash/20260319153000 버전: order_items.reform_data 컬럼 INSERT
-- 현재 테이블 : item_data jsonb 컬럼
DROP FUNCTION IF EXISTS public.create_custom_order_txn(uuid, jsonb, integer, text[], text, boolean, text);

CREATE OR REPLACE FUNCTION public.create_custom_order_txn(
  p_shipping_address_id uuid,
  p_options jsonb,
  p_quantity integer,
  p_reference_images jsonb DEFAULT '[]'::jsonb,
  p_additional_notes text DEFAULT '',
  p_sample boolean DEFAULT null,
  p_sample_type text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
-- SECURITY DEFINER: 이 함수는 호출자(authenticated 역할)가 직접 쓰기 권한을 갖지 않는
-- orders, order_items 테이블에 INSERT를 수행해야 하므로 SECURITY DEFINER가 필요하다.
-- auth.uid() 소유권 검증 및 shipping_addresses 존재 확인으로 권한 남용을 방지한다.
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_payment_group_id uuid;
  v_sewing_cost integer;
  v_fabric_cost integer;
  v_sample_cost integer;
  v_total_cost integer;
  v_reform_data jsonb;
  v_elem jsonb;
  v_idx integer;
  v_base_unit integer;
  v_remainder integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_sample is not null or p_sample_type is not null then
    raise exception 'Legacy sample parameters (p_sample, p_sample_type) are no longer supported. Use create_sample_order_txn instead.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Invalid quantity';
  end if;

  if p_reference_images is not null and jsonb_typeof(p_reference_images) <> 'array' then
    raise exception 'p_reference_images must be a JSON array';
  end if;

  v_idx := 0;
  if p_reference_images is not null then
    for v_elem in select jsonb_array_elements(p_reference_images) loop
      if jsonb_typeof(v_elem) <> 'object'
         or not (v_elem ? 'url')
         or not (v_elem ? 'file_id')
         or jsonb_typeof(v_elem->'url') <> 'string'
         or jsonb_typeof(v_elem->'file_id') not in ('string', 'null') then
        raise exception 'p_reference_images[%] must be an object with string "url" and "file_id" keys, and "file_id" must be a string or null', v_idx;
      end if;
      v_idx := v_idx + 1;
    end loop;
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
    amounts.sample_cost,
    amounts.total_cost
  into
    v_sewing_cost,
    v_fabric_cost,
    v_sample_cost,
    v_total_cost
  from public.calculate_custom_order_amounts(p_options, p_quantity) as amounts;

  v_base_unit := floor(v_total_cost::numeric / p_quantity)::integer;
  v_remainder := v_total_cost - v_base_unit * p_quantity;

  v_order_number := public.generate_order_number();
  v_payment_group_id := gen_random_uuid();

  insert into public.orders (
    user_id,
    order_number,
    shipping_address_id,
    total_price,
    original_price,
    total_discount,
    order_type,
    status,
    payment_group_id,
    sample_cost
  )
  values (
    v_user_id,
    v_order_number,
    p_shipping_address_id,
    v_total_cost,
    v_total_cost,
    0,
    'custom',
    '대기중',
    v_payment_group_id,
    v_sample_cost
  )
  returning id into v_order_id;

  v_reform_data := jsonb_build_object(
    'custom_order', true,
    'quantity', p_quantity,
    'options', p_options,
    'reference_images', coalesce(p_reference_images, '[]'::jsonb),
    'additional_notes', coalesce(p_additional_notes, ''),
    'pricing', jsonb_build_object(
      'sewing_cost', v_sewing_cost,
      'fabric_cost', v_fabric_cost,
      'sample_cost', v_sample_cost,
      'total_cost', v_total_cost,
      'unit_price_remainder', v_remainder
    )
  );

  insert into public.order_items (
    order_id,
    item_id,
    item_type,
    product_id,
    selected_option_id,
    item_data,
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

  -- images 테이블에 참조 이미지 등록
  -- SECURITY DEFINER이므로 RLS bypass. RPC 내부에서 이미 v_user_id := auth.uid() 소유권 검증 완료.
  IF p_reference_images IS NOT NULL AND jsonb_array_length(p_reference_images) > 0 THEN
    INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
    SELECT
      elem->>'url',
      nullif(elem->>'file_id', ''),
      '/custom-orders',
      'custom_order',
      v_order_id::text,
      v_user_id
    FROM jsonb_array_elements(p_reference_images) AS elem;
  END IF;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_group_id', v_payment_group_id
  );
end;
$$;

-- ── 3. manage_design_tokens_admin ─────────────────────────────
-- squash 버전: p_expires_at 파라미터 + design_tokens.expires_at 컬럼 참조
-- 현재 테이블 : expires_at 컬럼 없음
DROP FUNCTION IF EXISTS public.manage_design_tokens_admin(uuid, integer, timestamptz, text);

CREATE OR REPLACE FUNCTION public.manage_design_tokens_admin(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
-- 관리자가 다른 사용자의 토큰을 조정해야 하므로 RLS를 일시적으로 우회하기 위해
-- 이 함수는 SECURITY DEFINER로 실행된다. 이 권한 상승은 관리 토큰 관리(admin)
-- 목적으로만 제한되며, 관리자(admin role)만 호출 가능하다.
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'amount must not be zero';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'description is required for audit trail';
  END IF;

  IF p_amount < 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
  END IF;

  SELECT COALESCE(SUM(amount), 0)::integer
    INTO v_balance
    FROM public.design_tokens
   WHERE user_id = p_user_id;

  IF p_amount < 0 THEN
    IF v_balance < abs(p_amount) THEN
      RAISE EXCEPTION 'insufficient_tokens';
    END IF;
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, token_class, description)
  VALUES (p_user_id, p_amount, 'admin', 'paid', p_description);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_balance + p_amount
  );
END;
$$;

-- ── 4. confirm_payment_orders ─────────────────────────────────
-- error: ON CONFLICT (work_id) DO NOTHING
--        → design_tokens의 partial unique index (WHERE work_id IS NOT NULL)와 일치하도록
--          ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING 으로 수정
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
  v_token_amount integer;
  v_plan_key text;
  v_plan_label text;
  v_sample_coupon_id uuid;
  v_coupon_row_count integer := 0;
  v_sample_type text;
  v_sample_design_type text;
  v_coupon_name text;
  v_pricing_key text;
  v_discount_amount integer;
begin
  -- p_user_id NULL 이면 호출자 신원 불명 → 즉시 거부
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  if p_payment_key is null or trim(p_payment_key) = '' then
    raise exception 'payment_key is required';
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

    -- repair → 발송대기 (기존: else '접수')
    v_post_status := case v_order.order_type
      when 'sale'   then '진행중'
      when 'token'  then '완료'
      when 'sample' then '접수'
      when 'repair' then '발송대기'
      else '접수'
    end;

    update public.orders
    set status = v_post_status, payment_key = p_payment_key, updated_at = now()
    where id = v_order.id;

    insert into public.order_status_logs (
      order_id, changed_by, previous_status, new_status, memo
    ) values (
      v_order.id, p_user_id, v_order.status, v_post_status,
      'payment confirmed: ' || v_masked_key
    );

    -- token 주문: 토큰 지급
    if v_order.order_type = 'token' then
      select
        (oi.item_data->>'token_amount')::integer,
        oi.item_data->>'plan_key'
      into v_token_amount, v_plan_key
      from public.order_items oi
      where oi.order_id = v_order.id and oi.item_type = 'token'
      limit 1;

      if v_token_amount is null or v_token_amount <= 0 then
        raise exception 'token order % has no valid token_amount (plan_key: %)', v_order.id, v_plan_key;
      end if;

      v_plan_label := case v_plan_key
        when 'starter' then 'Starter'
        when 'popular' then 'Popular'
        when 'pro'     then 'Pro'
        else v_plan_key
      end;

      -- 토큰 지급: ON CONFLICT partial index 조건 명시 (TOCTOU 방지)
      insert into public.design_tokens (user_id, amount, type, token_class, description, work_id)
      values (
        p_user_id,
        v_token_amount,
        'purchase',
        'paid',
        '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개)',
        'order_' || v_order.id::text || '_paid'
      )
      on conflict (work_id) where work_id is not null do nothing;
    end if;

    v_coupon_row_count := 0;
    if v_order.order_type = 'sample' then
      -- order_items에서 sample_type, design_type 추출
      select oi.item_data->>'sample_type',
             oi.item_data->'options'->>'design_type'
      into v_sample_type, v_sample_design_type
      from public.order_items oi
      where oi.order_id = v_order.id and oi.item_type = 'sample'
      limit 1;

      select mapped.coupon_name, mapped.pricing_key
      into v_coupon_name, v_pricing_key
      from public.get_sample_coupon_and_pricing(
        v_sample_type,
        v_sample_design_type
      ) as mapped;

      -- ⚠️ 샘플 할인값의 원본은 pricing_constants이며,
      -- coupons 테이블의 SAMPLE_DISCOUNT_* row는 이 값을 기반으로 자동 동기화됩니다.
      -- 쿠폰 관리 페이지에서 직접 수정하지 마세요.
      select pc.amount into v_discount_amount
      from public.pricing_constants pc
      where pc.key = v_pricing_key;

      if v_discount_amount is null then
        raise exception 'Sample discount pricing key % is not configured; coupons_name_unique upsert cannot continue', v_pricing_key;
      end if;

      -- coupons row 동기화 (user_coupons FK용)
      insert into public.coupons (name, discount_type, discount_value, max_discount_amount, expiry_date, is_active)
      values (v_coupon_name, 'fixed', v_discount_amount, v_discount_amount, '2099-12-31', true)
      on conflict (name)
      do update set discount_value = excluded.discount_value,
                   max_discount_amount = excluded.max_discount_amount,
                   discount_type = excluded.discount_type,
                   expiry_date = excluded.expiry_date,
                   is_active = excluded.is_active
      returning id into v_sample_coupon_id;

      if v_sample_coupon_id is not null then
        insert into public.user_coupons (user_id, coupon_id, status)
        values (p_user_id, v_sample_coupon_id, 'active')
        on conflict (user_id, coupon_id) do nothing;

        get diagnostics v_coupon_row_count = row_count;
      end if;
    end if;

    v_updated_orders := v_updated_orders || jsonb_build_object(
      'orderId',     v_order.id,
      'orderType',   v_order.order_type,
      'tokenAmount', case when v_order.order_type = 'token' then v_token_amount else null end,
      'couponIssued', case when v_order.order_type = 'sample' then (v_coupon_row_count > 0) else null end
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

-- ── 5. create_order_txn ───────────────────────────────────────
-- warning: 선언만 하고 한 번도 사용하지 않는 v_order_type 변수 제거
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
  v_tie_image text;
  v_tie_file_id text;
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
        FROM pricing_constants WHERE key = 'REFORM_BASE_COST';
        IF v_reform_base_cost IS NULL THEN
          RAISE EXCEPTION 'Missing pricing constant: REFORM_BASE_COST';
        END IF;

        SELECT amount INTO v_reform_shipping_cost
        FROM pricing_constants WHERE key = 'REFORM_SHIPPING_COST';
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
        selected_option_id, item_data, quantity,
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
        selected_option_id, item_data, quantity,
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

      -- reform 이미지 라이프사이클 추적: tie 이미지를 images 테이블에 등록
      v_tie_image := nullif(trim(v_item->'reform_data'->'tie'->>'image'), '');
      v_tie_file_id := nullif(trim(v_item->'reform_data'->'tie'->>'fileId'), '');
      IF v_tie_image IS NOT NULL THEN
        INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by)
        VALUES (v_tie_image, v_tie_file_id, '/reform', 'reform', v_order_id::text, v_user_id);
      END IF;
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

-- ── 6. admin_update_order_status ─────────────────────────────
-- warning: 선택 후 한 번도 읽지 않는 v_total_price 변수 제거
--          (SELECT INTO에서도 o.total_price 제거)
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_memo text DEFAULT NULL,
  p_is_rollback boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id       uuid;
  v_current_status text;
  v_order_type     text;
  v_user_id        uuid;
  v_token_amount   integer;
  v_plan_key       text;
  v_plan_label     text;
  v_payment_key    text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Lock the row and get current status, order type, user
  select o.status, o.order_type, o.user_id, o.payment_key
  into v_current_status, v_order_type, v_user_id, v_payment_key
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  if p_is_rollback then
    -- Rollback requires memo
    if p_memo is null or trim(p_memo) = '' then
      raise exception '롤백 시 사유 입력 필수';
    end if;

    -- Validate rollback transition by order_type
    -- 배송완료, 완료, 취소 상태는 is_rollback 여부와 무관하게 롤백 불가
    if v_order_type = 'sale' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '진행중' and p_new_status = '대기중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '결제중'   and p_new_status = '대기중')
        or (v_current_status = '접수'   and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
        or (v_current_status = '제작완료' and p_new_status = '제작중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'sample' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '접수' and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for sample order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '접수' and p_new_status = '대기중')
        or (v_current_status = '수선중' and p_new_status = '접수')
        or (v_current_status = '수선완료' and p_new_status = '수선중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      -- token 롤백: 결제중 → 대기중 만 허용
      if not (
        (v_current_status = '결제중' and p_new_status = '대기중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for token order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  else
    -- Validate forward state transition by order_type
    if v_order_type = 'sale' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '진행중')
        or (v_current_status = '진행중'   and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '진행중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'   and p_new_status = '제작중')
        or (v_current_status = '제작중'   and p_new_status = '제작완료')
        or (v_current_status = '제작완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'sample' then
      if not (
        (v_current_status = '대기중' and p_new_status = '접수')
        or (v_current_status = '접수' and p_new_status = '제작중')
        or (v_current_status = '제작중' and p_new_status = '배송중')
        or (v_current_status = '배송중' and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sample order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'     and p_new_status = '수선중')
        or (v_current_status = '수선중'   and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for repair order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'token' then
      -- token 순방향: 대기중 → 완료 (payment_key 필수), 취소
      if not (
        (v_current_status = '대기중' and p_new_status = '완료' and v_payment_key is not null and length(btrim(v_payment_key)) > 0)
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for token order', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown order type: %', v_order_type;
    end if;
  end if;

  -- Apply the status update with any timestamp side-effects
  if p_new_status = '배송중' then
    update public.orders
    set status = p_new_status,
        shipped_at = coalesce(shipped_at, now())
    where id = p_order_id;

  elsif p_new_status = '배송완료' then
    update public.orders
    set status = p_new_status,
        delivered_at = now()
    where id = p_order_id;

  elsif p_new_status = '완료' then
    -- token 주문: 상태 변경 전 token item 검증 (부분 성공 방지)
    if v_order_type = 'token' then
      if not exists (select 1 from public.design_tokens where work_id = 'order_' || p_order_id::text) then
        select (oi.item_data->>'token_amount')::integer, oi.item_data->>'plan_key'
        into v_token_amount, v_plan_key
        from public.order_items oi
        where oi.order_id = p_order_id and oi.item_type = 'token'
        limit 1;

        if v_token_amount is null or v_token_amount <= 0 then
          raise exception 'token order % has no valid token item (token_amount: %)', p_order_id, v_token_amount;
        end if;

        v_plan_label := case v_plan_key
          when 'starter' then 'Starter'
          when 'popular' then 'Popular'
          when 'pro'     then 'Pro'
          else coalesce(v_plan_key, '구매')
        end;

        insert into public.design_tokens (
          user_id,
          amount,
          type,
          token_class,
          description,
          work_id
        )
        values (
          v_user_id,
          v_token_amount,
          'purchase',
          'paid',
          '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개, 관리자 확정)',
          'order_' || p_order_id::text
        )
        on conflict (work_id) do nothing;
      end if;
    end if;

    update public.orders
    set status       = p_new_status,
        confirmed_at = now()
    where id = p_order_id;

  else
    update public.orders
    set status = p_new_status
    where id = p_order_id;
  end if;

  -- Insert status log
  insert into public.order_status_logs (
    order_id,
    changed_by,
    previous_status,
    new_status,
    memo,
    is_rollback
  )
  values (
    p_order_id,
    v_admin_id,
    v_current_status,
    p_new_status,
    p_memo,
    p_is_rollback
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;
