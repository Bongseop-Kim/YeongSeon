-- =============================================================
-- 98_functions_payment.sql  – Payment RPC functions
-- =============================================================
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

    v_post_status := case v_order.order_type
      when 'sale'  then '진행중'
      when 'token' then '완료'
      when 'sample' then '접수'
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

      -- 토큰 지급: ON CONFLICT (work_id) DO NOTHING으로 TOCTOU 방지
      insert into public.design_tokens (user_id, amount, type, token_class, description, work_id)
      values (
        p_user_id,
        v_token_amount,
        'purchase',
        'paid',
        '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개)',
        'order_' || v_order.id::text || '_paid'
      )
      on conflict (work_id) do nothing;
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

      -- 조합으로 쿠폰 name 및 pricing_constants key 결정
      v_coupon_name := case v_sample_type
        when 'sewing' then 'SAMPLE_DISCOUNT_SEWING'
        when 'fabric' then
          case v_sample_design_type
            when 'PRINTING' then 'SAMPLE_DISCOUNT_FABRIC_PRINTING'
            else 'SAMPLE_DISCOUNT_FABRIC_YARN_DYED'
          end
        else
          case v_sample_design_type
            when 'PRINTING' then 'SAMPLE_DISCOUNT_FABRIC_AND_SEWING_PRINTING'
            else 'SAMPLE_DISCOUNT_FABRIC_AND_SEWING_YARN_DYED'
          end
      end;

      v_pricing_key := case v_sample_type
        when 'sewing' then 'sample_discount_sewing'
        when 'fabric' then
          case v_sample_design_type
            when 'PRINTING' then 'sample_discount_fabric_printing'
            else 'sample_discount_fabric_yarn_dyed'
          end
        else
          case v_sample_design_type
            when 'PRINTING' then 'sample_discount_fabric_and_sewing_printing'
            else 'sample_discount_fabric_and_sewing_yarn_dyed'
          end
      end;

      -- ⚠️ 샘플 할인값의 원본은 pricing_constants이며,
      -- coupons 테이블의 SAMPLE_DISCOUNT_* row는 이 값을 기반으로 자동 동기화됩니다.
      -- 쿠폰 관리 페이지에서 직접 수정하지 마세요.
      select pc.amount into v_discount_amount
      from public.pricing_constants pc
      where pc.key = v_pricing_key;

      -- coupons row 동기화 (user_coupons FK용)
      insert into public.coupons (name, discount_type, discount_value, max_discount_amount, expiry_date, is_active)
      values (v_coupon_name, 'fixed', v_discount_amount, v_discount_amount, '2099-12-31', true)
      on conflict on constraint coupons_sample_discount_unique
      do update set discount_value = excluded.discount_value,
                   max_discount_amount = excluded.max_discount_amount;

      select c.id into v_sample_coupon_id
      from public.coupons c
      where c.name = v_coupon_name and c.is_active = true
      limit 1;

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

    elsif v_order.status in ('진행중', '접수', '완료') then
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

    elsif v_order.status in ('진행중', '접수', '완료') then
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

-- unlock_payment_orders: service_role 전용
REVOKE EXECUTE ON FUNCTION public.unlock_payment_orders(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_payment_orders(uuid, uuid) TO service_role;
