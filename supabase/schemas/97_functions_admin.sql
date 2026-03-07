-- ============================================================= 
-- 97_functions_admin.sql  – Admin management RPC functions 
-- =============================================================
-- ── admin_update_order_status ─────────────────────────────────
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
  v_total_price    integer;
  v_user_id        uuid;
  v_points_earned  integer;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Lock the row and get current status, order type, price, user
  select o.status, o.order_type, o.total_price, o.user_id
  into v_current_status, v_order_type, v_total_price, v_user_id
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
        (v_current_status = '결제중' and p_new_status = '대기중')
        or (v_current_status = '접수' and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
        or (v_current_status = '제작완료' and p_new_status = '제작중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for custom order', v_current_status, p_new_status;
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
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '진행중', '배송중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'     and p_new_status = '제작중')
        or (v_current_status = '제작중'   and p_new_status = '제작완료')
        or (v_current_status = '제작완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '접수'     and p_new_status = '수선중')
        or (v_current_status = '수선중'   and p_new_status = '수선완료')
        or (v_current_status = '수선완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '접수'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for repair order', v_current_status, p_new_status;
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
    -- Admin manually confirms purchase: 2% points
    v_points_earned := floor(v_total_price * 0.02);

    update public.orders
    set status       = p_new_status,
        confirmed_at = now()
    where id = p_order_id;

    if v_points_earned > 0 then
      insert into public.points (user_id, order_id, amount, type, description)
      values (
        v_user_id,
        p_order_id,
        v_points_earned,
        'earn',
        '구매확정 포인트 적립 (관리자 처리, 2%)'
      );
    end if;

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


-- ── admin_get_today_stats ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_today_stats(
  p_order_type text,
  p_date text
)
RETURNS TABLE (
  today_order_count bigint,
  today_revenue numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_date is null or p_date = '' then
    raise exception 'p_date is required';
  end if;

  if p_order_type is null or p_order_type not in ('all', 'sale', 'custom', 'repair') then
    raise exception 'invalid p_order_type: %', p_order_type;
  end if;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS today_order_count,
    COALESCE(SUM("totalPrice"), 0)::numeric AS today_revenue
  FROM public.admin_order_list_view
  WHERE date = p_date
    AND (
      p_order_type = 'all'
      OR "orderType" = p_order_type
    );
end;
$$;

-- ── admin_get_period_stats ───────────────────────────────────
-- 기간 범위(start~end)의 주문 수와 매출 합계를 집계한다.
-- admin_get_today_stats 는 단일 날짜 전용으로 유지하고,
-- 날짜 범위 조회는 이 함수를 사용한다.
CREATE OR REPLACE FUNCTION public.admin_get_period_stats(
  p_order_type  text,
  p_start_date  date,
  p_end_date    date
)
RETURNS TABLE (
  period_order_count bigint,
  period_revenue     numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_start_date is null then
    raise exception 'p_start_date is required';
  end if;

  if p_end_date is null then
    raise exception 'p_end_date is required';
  end if;

  if p_start_date > p_end_date then
    raise exception 'p_start_date must be <= p_end_date';
  end if;

  if p_order_type is null or p_order_type not in ('all', 'sale', 'custom', 'repair') then
    raise exception 'invalid p_order_type: %', p_order_type;
  end if;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint                        AS period_order_count,
    COALESCE(SUM(total_price), 0)::numeric  AS period_revenue
  FROM public.orders
  WHERE created_at >= p_start_date
    AND created_at <  p_end_date + 1
    AND (
      p_order_type = 'all'
      OR order_type = p_order_type
    );
end;
$$;

-- ── admin_update_order_tracking ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_order_tracking(
  p_order_id uuid,
  p_courier_company text DEFAULT NULL,
  p_tracking_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_tracking_number text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_tracking_number := nullif(trim(p_tracking_number), '');

  update public.orders
  set
    courier_company = nullif(trim(p_courier_company), ''),
    tracking_number = v_tracking_number,
    shipped_at = case
      when v_tracking_number is not null then coalesce(shipped_at, now())
      else shipped_at
    end
  where id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  return jsonb_build_object('success', true, 'order_id', p_order_id);
end;
$$;

-- ── admin_bulk_issue_coupons ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_bulk_issue_coupons(
  p_coupon_id uuid,
  p_user_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_affected_count integer := 0;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_ids is null or coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return jsonb_build_object('success', true, 'affected_count', 0);
  end if;

  with target_user_ids as (
    select distinct t.user_id
    from unnest(p_user_ids) as t(user_id)
    where t.user_id is not null
  ),
  upserted as (
    insert into public.user_coupons (user_id, coupon_id, status)
    select user_id, p_coupon_id, 'active'
    from target_user_ids
    on conflict (user_id, coupon_id)
    do update set status = excluded.status
    returning 1
  )
  select count(*)
  into v_affected_count
  from upserted;

  return jsonb_build_object('success', true, 'affected_count', v_affected_count);
end;
$$;

-- ── admin_revoke_coupons_by_ids ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_revoke_coupons_by_ids(
  p_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_affected_count integer := 0;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_ids is null or coalesce(array_length(p_ids, 1), 0) = 0 then
    return jsonb_build_object('success', true, 'affected_count', 0);
  end if;

  update public.user_coupons
  set status = 'revoked'
  where id = any(p_ids)
    and status = 'active';

  get diagnostics v_affected_count = row_count;

  return jsonb_build_object('success', true, 'affected_count', v_affected_count);
end;
$$;

-- ── admin_revoke_coupons_by_user_ids ────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_revoke_coupons_by_user_ids(
  p_coupon_id uuid,
  p_user_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_affected_count integer := 0;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_ids is null or coalesce(array_length(p_user_ids, 1), 0) = 0 then
    return jsonb_build_object('success', true, 'affected_count', 0);
  end if;

  update public.user_coupons
  set status = 'revoked'
  where coupon_id = p_coupon_id
    and user_id = any(p_user_ids)
    and status = 'active';

  get diagnostics v_affected_count = row_count;

  return jsonb_build_object('success', true, 'affected_count', v_affected_count);
end;
$$;

