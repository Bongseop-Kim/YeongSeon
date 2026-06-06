-- =============================================================
-- 98_functions_payment.sql  – Payment RPC functions
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_sample_coupon_and_pricing(
  p_sample_type text,
  p_sample_design_type text
)
RETURNS TABLE (coupon_name text, pricing_key text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  if p_sample_type = 'sewing' then
    coupon_name := 'SAMPLE_DISCOUNT_SEWING';
    pricing_key := 'sample_discount_sewing';
  elsif p_sample_type = 'fabric' then
    if p_sample_design_type = 'PRINTING' then
      coupon_name := 'SAMPLE_DISCOUNT_FABRIC_PRINTING';
      pricing_key := 'sample_discount_fabric_printing';
    else
      coupon_name := 'SAMPLE_DISCOUNT_FABRIC_YARN_DYED';
      pricing_key := 'sample_discount_fabric_yarn_dyed';
    end if;
  elsif p_sample_type = 'fabric_and_sewing' then
    if p_sample_design_type = 'PRINTING' then
      coupon_name := 'SAMPLE_DISCOUNT_FABRIC_AND_SEWING_PRINTING';
      pricing_key := 'sample_discount_fabric_and_sewing_printing';
    else
      coupon_name := 'SAMPLE_DISCOUNT_FABRIC_AND_SEWING_YARN_DYED';
      pricing_key := 'sample_discount_fabric_and_sewing_yarn_dyed';
    end if;
  else
    raise exception 'Unsupported sample_type: %', p_sample_type;
  end if;

  return next;
end;
$$;

-- ── confirm_payment_orders ──────────────────────────────────────
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
  v_caller_role text;
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

  v_caller_role := auth.role();

  -- service_role만 auth.uid() = null 상태로 우회 가능
  if auth.uid() is null then
    if v_caller_role is distinct from 'service_role' then
      raise exception 'Forbidden';
    end if;
  elsif p_user_id is distinct from auth.uid() then
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

    -- repair → 발송대기 / 방문 수거 신청 주문은 수거예정
    v_post_status := case v_order.order_type
      when 'sale'   then '진행중'
      when 'token'  then '완료'
      when 'sample' then '접수'
      when 'repair' then case
        when exists (
          select 1 from public.repair_pickup_requests r
          where r.order_id = v_order.id
        ) then '수거예정'
        else '발송대기'
      end
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

      -- 토큰 지급: source_order_id + expires_at 설정 (만료: 구매 시점 + 1년)
      insert into public.design_tokens (
        user_id, amount, type, token_class, description, work_id,
        source_order_id, expires_at
      )
      values (
        p_user_id,
        v_token_amount,
        'purchase',
        'paid',
        '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개)',
        'order_' || v_order.id::text,
        v_order.id,
        now() + interval '1 year'
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

COMMENT ON FUNCTION public.confirm_payment_orders(uuid, uuid, text)
IS 'Security definer reason: service-role payment confirmation updates orders, coupon state, token balances, and audit logs with function-owner privileges while validating user ownership and fixed search_path.';

-- confirm_payment_orders: service_role 전용
REVOKE EXECUTE ON FUNCTION public.confirm_payment_orders(uuid, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_orders(uuid, uuid, text) TO service_role;

-- ── lock_payment_orders ──────────────────────────────────────────
-- Toss 호출 전 주문 그룹을 '대기중' → '결제중'으로 원자적 전환.
-- SECURITY DEFINER: order_status_logs INSERT에 일반 유저 RLS 없음
CREATE OR REPLACE FUNCTION public.lock_payment_orders(
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
  v_locked_orders jsonb := '[]'::jsonb;
  v_count int := 0;
  v_already_locked boolean := false;
  v_already_confirmed boolean := false;
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

    if v_order.status = '대기중' then
      -- 정상 경로: 대기중 → 결제중
      update public.orders
      set status = '결제중', updated_at = now()
      where id = v_order.id;

      insert into public.order_status_logs (
        order_id, changed_by, previous_status, new_status, memo
      ) values (
        v_order.id, p_user_id, '대기중', '결제중', 'payment lock'
      );

    elsif v_order.status = '결제중' then
      -- 멱등: 이미 lock됨
      v_already_locked := true;

    elsif v_order.status in ('진행중', '발송대기', '발송중', '수거예정', '접수', '완료') then
      -- 이미 결제 완료 상태
      v_already_confirmed := true;

    else
      raise exception 'Order % is not payable (status: %)', v_order.id, v_order.status;
    end if;

    v_locked_orders := v_locked_orders || jsonb_build_object(
      'orderId', v_order.id,
      'orderType', v_order.order_type
    );
  end loop;

  if v_count = 0 then
    raise exception 'No orders found for payment_group_id %', p_payment_group_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'orders', v_locked_orders,
    'already_locked', v_already_locked,
    'already_confirmed', v_already_confirmed
  );
end;
$$;

COMMENT ON FUNCTION public.lock_payment_orders(uuid, uuid)
IS 'Security definer reason: service-role payment locking updates order statuses and audit logs with function-owner privileges while validating user ownership and fixed search_path.';

-- lock_payment_orders: service_role 전용
REVOKE EXECUTE ON FUNCTION public.lock_payment_orders(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lock_payment_orders(uuid, uuid) TO service_role;

-- ── unlock_payment_orders ────────────────────────────────────────
-- Toss 승인 실패 시 '결제중' → '대기중'으로 복구.
-- SECURITY DEFINER: order_status_logs INSERT에 일반 유저 RLS 없음
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

    elsif v_order.status in ('진행중', '발송대기', '발송중', '수거예정', '접수', '완료') then
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

COMMENT ON FUNCTION public.unlock_payment_orders(uuid, uuid)
IS 'Security definer reason: service-role payment unlock restores order and coupon reservation state with function-owner privileges while validating user ownership and fixed search_path.';

-- unlock_payment_orders: service_role 전용
REVOKE EXECUTE ON FUNCTION public.unlock_payment_orders(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_payment_orders(uuid, uuid) TO service_role;

-- ── submit_repair_tracking ────────────────────────────────────────
-- 고객이 직접 수선품 발송 후 송장번호를 등록하는 RPC.
-- 발송대기 → 발송중 전이. 발송 사진(p_photos: [{url, fileId}])은 선택.
-- SECURITY DEFINER: order_status_logs는 INSERT RLS 정책이 없으므로 audit log 작성을 위해 DEFINER 필요.
-- 소유권 검증은 auth.uid()와 orders.user_id 비교로 수행.
CREATE OR REPLACE FUNCTION public.submit_repair_tracking(
  p_order_id uuid,
  p_courier_company text,
  p_tracking_number text,
  p_photos jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order record;
  v_courier_code text;
  v_tracking_number text;
  v_photos jsonb;
  v_photo jsonb;
  v_photo_url text;
  v_photo_file_id text;
  v_photo_row_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_courier_company is null or trim(p_courier_company) = '' then
    raise exception '택배사를 선택해주세요';
  end if;

  -- 택배사 목록은 프론트 상수(@yeongseon/shared courier-companies)가 단일 소스.
  -- 서버는 코드 형식만 검증한다 (소문자 영문/숫자, 30자 이내).
  v_courier_code := lower(trim(p_courier_company));
  if v_courier_code !~ '^[a-z0-9_-]{1,30}$' then
    raise exception '올바르지 않은 택배사 코드입니다: %', p_courier_company;
  end if;

  if p_tracking_number is null or trim(p_tracking_number) = '' then
    raise exception '송장번호를 입력해주세요';
  end if;

  v_tracking_number := trim(p_tracking_number);

  v_photos := coalesce(p_photos, '[]'::jsonb);
  if jsonb_typeof(v_photos) <> 'array' then
    raise exception '발송 사진 형식이 올바르지 않습니다';
  end if;
  if jsonb_array_length(v_photos) > 3 then
    raise exception '발송 사진은 최대 3장까지 첨부할 수 있습니다';
  end if;

  select id, user_id, status
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception '주문을 찾을 수 없습니다';
  end if;

  if v_order.user_id is distinct from v_user_id then
    raise exception 'Forbidden';
  end if;

  if v_order.status != '발송대기' then
    raise exception '발송대기 상태에서만 송장번호를 등록할 수 있습니다 (현재 상태: %)', v_order.status;
  end if;

  update public.orders
  set
    status          = '발송중',
    courier_company = v_courier_code,
    tracking_number = v_tracking_number,
    shipped_at      = now(),
    updated_at      = now()
  where id = p_order_id;

  insert into public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) values (
    p_order_id, v_user_id, '발송대기', '발송중',
    '고객 발송 처리: ' || v_courier_code || ' ' || v_tracking_number
  );

  -- 발송 사진: 업로드 시 등록된 repair_shipping_upload 이미지를 주문에 연결
  if jsonb_array_length(v_photos) > 0 then
    for v_photo in select * from jsonb_array_elements(v_photos)
    loop
      v_photo_url := nullif(trim(coalesce(v_photo->>'url', '')), '');
      v_photo_file_id := nullif(trim(coalesce(v_photo->>'fileId', '')), '');
      if v_photo_url is null or v_photo_file_id is null then
        raise exception '발송 사진 정보가 올바르지 않습니다';
      end if;

      update public.images
      set folder = '/repair-shipping',
          entity_type = 'repair_shipping',
          entity_id = p_order_id::text
      where entity_type = 'repair_shipping_upload'
        and entity_id = v_photo_file_id
        and file_id = v_photo_file_id
        and url = v_photo_url
        and uploaded_by = v_user_id;

      get diagnostics v_photo_row_count = row_count;
      if v_photo_row_count = 0 then
        raise exception 'Repair shipping photo not found or not owned';
      end if;
    end loop;

  end if;

  insert into public.repair_shipping_receipts (
    order_id, receipt_type, photos
  ) values (
    p_order_id, 'tracking', coalesce(v_photos, p_photos, '[]'::jsonb)
  );
end;
$$;

COMMENT ON FUNCTION public.submit_repair_tracking(uuid, text, text, jsonb)
IS 'Security definer reason: allows authenticated order owners to update repair tracking, image linkage, and audit-log tables with function-owner privileges while enforcing auth.uid ownership checks.';

GRANT EXECUTE ON FUNCTION public.submit_repair_tracking(uuid, text, text, jsonb) TO authenticated;

-- ── submit_repair_no_tracking ─────────────────────────────────────
-- 송장번호 없이(퀵/해외배송/송장 분실) 수선품 발송을 접수하는 RPC.
-- 발송대기 → 발송확인중 전이. 관리자가 입고 확인 후 접수 처리한다.
-- SECURITY DEFINER 근거는 submit_repair_tracking과 동일.
CREATE OR REPLACE FUNCTION public.submit_repair_no_tracking(
  p_order_id uuid,
  p_reason text,
  p_memo text DEFAULT NULL,
  p_photos jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id uuid;
  v_order record;
  v_reason text;
  v_memo text;
  v_photos jsonb;
  v_photo jsonb;
  v_photo_url text;
  v_photo_file_id text;
  v_photo_row_count integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if v_reason is null or v_reason not in ('quick', 'overseas', 'lost') then
    raise exception '접수 사유를 선택해주세요 (허용 값: quick, overseas, lost)';
  end if;

  v_memo := nullif(trim(coalesce(p_memo, '')), '');
  if v_memo is not null and char_length(v_memo) > 500 then
    raise exception '메모는 500자 이내로 입력해주세요';
  end if;

  v_photos := coalesce(p_photos, '[]'::jsonb);
  if jsonb_typeof(v_photos) <> 'array' then
    raise exception '발송 사진 형식이 올바르지 않습니다';
  end if;
  if jsonb_array_length(v_photos) > 3 then
    raise exception '발송 사진은 최대 3장까지 첨부할 수 있습니다';
  end if;

  select id, user_id, status
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception '주문을 찾을 수 없습니다';
  end if;

  if v_order.user_id is distinct from v_user_id then
    raise exception 'Forbidden';
  end if;

  if v_order.status != '발송대기' then
    raise exception '발송대기 상태에서만 접수할 수 있습니다 (현재 상태: %)', v_order.status;
  end if;

  update public.orders
  set
    status     = '발송확인중',
    shipped_at = now(),
    updated_at = now()
  where id = p_order_id;

  insert into public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) values (
    p_order_id, v_user_id, '발송대기', '발송확인중',
    '고객 송장 없는 발송 접수: ' || v_reason
  );

  -- 발송 사진: 업로드 시 등록된 repair_shipping_upload 이미지를 주문에 연결
  if jsonb_array_length(v_photos) > 0 then
    for v_photo in select * from jsonb_array_elements(v_photos)
    loop
      v_photo_url := nullif(trim(coalesce(v_photo->>'url', '')), '');
      v_photo_file_id := nullif(trim(coalesce(v_photo->>'fileId', '')), '');
      if v_photo_url is null or v_photo_file_id is null then
        raise exception '발송 사진 정보가 올바르지 않습니다';
      end if;

      update public.images
      set folder = '/repair-shipping',
          entity_type = 'repair_shipping',
          entity_id = p_order_id::text
      where entity_type = 'repair_shipping_upload'
        and entity_id = v_photo_file_id
        and file_id = v_photo_file_id
        and url = v_photo_url
        and uploaded_by = v_user_id;

      get diagnostics v_photo_row_count = row_count;
      if v_photo_row_count = 0 then
        raise exception 'Repair shipping photo not found or not owned';
      end if;
    end loop;
  end if;

  insert into public.repair_shipping_receipts (
    order_id, receipt_type, reason, memo, photos
  ) values (
    p_order_id, 'no_tracking', v_reason, v_memo, v_photos
  );
end;
$$;

COMMENT ON FUNCTION public.submit_repair_no_tracking(uuid, text, text, jsonb)
IS 'Security definer reason: allows authenticated order owners to submit no-tracking repair receipts, image linkage, and audit logs with function-owner privileges while enforcing auth.uid ownership checks.';

GRANT EXECUTE ON FUNCTION public.submit_repair_no_tracking(uuid, text, text, jsonb) TO authenticated;
