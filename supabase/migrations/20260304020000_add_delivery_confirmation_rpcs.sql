-- =============================================================
-- Migration: Update admin_update_order_status + add purchase confirmation RPCs
-- =============================================================

-- ── admin_update_order_status (updated) ──────────────────────
-- Changes from previous version:
--   • Forward transitions now include 배송중→배송완료 and 배송완료→완료
--   • 배송완료 transition sets delivered_at = now()
--   • 완료 transition sets confirmed_at = now() and earns 2% points
--   • 취소 is no longer allowed from 배송완료
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
  v_admin_id      uuid;
  v_current_status text;
  v_order_type    text;
  v_total_price   integer;
  v_user_id       uuid;
  v_points_earned integer;
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
      if not (v_current_status = '진행중' and p_new_status = '대기중') then
        raise exception 'Invalid rollback from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        (v_current_status = '접수' and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수')
        or (v_current_status = '제작완료' and p_new_status = '제작중')
      ) then
        raise exception 'Invalid rollback from "%" to "%" for custom order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'repair' then
      if not (
        (v_current_status = '접수' and p_new_status = '대기중')
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
        or (p_new_status = '취소' and v_current_status in ('대기중', '진행중', '배송중'))
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
        or (p_new_status = '취소' and v_current_status in ('대기중', '접수'))
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
        or (p_new_status = '취소' and v_current_status in ('대기중', '접수'))
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
    set status = p_new_status,
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


-- ── customer_confirm_purchase ─────────────────────────────────
-- Allows a customer to manually confirm purchase after delivery.
-- Earns 2% points. Only callable when status = '배송완료'.
-- SECURITY DEFINER: needed to INSERT into order_status_logs and points
--   (neither table has INSERT RLS policy for regular users).
CREATE OR REPLACE FUNCTION public.customer_confirm_purchase(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_user_id       uuid;
  v_current_status text;
  v_total_price   integer;
  v_points_earned integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Lock the row and verify ownership + status
  select o.status, o.total_price, o.user_id
  into v_current_status, v_total_price, v_user_id
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id
  for update;

  if not found then
    raise exception 'Order not found or access denied';
  end if;

  if v_current_status <> '배송완료' then
    raise exception '구매확정은 배송완료 상태에서만 가능합니다 (현재: %)', v_current_status;
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
    '배송완료',
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
-- Confirms all orders in '배송완료' that have been delivered for 7+ days.
-- Earns 0.5% points for auto-confirmed orders.
-- SECURITY DEFINER: runs as a privileged role outside user sessions.
CREATE OR REPLACE FUNCTION public.auto_confirm_delivered_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order   record;
  v_points  integer;
  v_count   integer := 0;
begin
  for v_order in
    select id, user_id, total_price
    from public.orders
    where status = '배송완료'
      and delivered_at <= now() - interval '7 days'
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
      '배송완료',
      '완료',
      '자동 구매확정 (배송완료 후 7일 경과)'
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'confirmed_count', v_count
  );
end;
$$;
