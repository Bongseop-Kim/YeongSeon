-- ============================================================
-- Allow purchase confirmation from '배송중' status
-- - customer_confirm_purchase: accept both '배송완료' and '배송중'
-- - auto_confirm_delivered_orders: also auto-confirm '배송중' orders
--   that have been shipped for 7+ days
-- - Add index for '배송중' auto-confirm query
-- ============================================================

-- ── customer_confirm_purchase (updated) ──────────────────────
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

-- ── auto_confirm_delivered_orders (updated) ───────────────────
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
  -- Only allow pg_cron / service_role (no authenticated user session)
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

-- ── Index for '배송중' auto-confirm query ──────────────────────
CREATE INDEX idx_orders_pending_confirm_shipping
  ON public.orders (shipped_at) WHERE status = '배송중';
