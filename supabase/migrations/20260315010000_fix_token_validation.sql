-- =============================================================
-- 20260315010000_fix_token_validation.sql
-- 결제 관련 추가 버그 수정 (20260315000000 이후 적용):
--   A. confirm_payment_orders: v_token_amount = 0 → <= 0 (음수 거부)
--   B. admin_update_order_status: token 완료 처리 시 상태 변경 전 token item 검증
--   C. admin_update_order_status: token 순방향 전이 시 공백 payment_key 차단
-- =============================================================

-- ── A. confirm_payment_orders: token validation 수정 ──
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
  v_points integer;
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

    -- token 주문: 토큰 부여 + 포인트 적립 (2%)
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

      -- 중복 방지: work_id로 idempotent 처리
      if not exists (select 1 from public.design_tokens where work_id = 'order_' || v_order.id::text) then
        insert into public.design_tokens (user_id, amount, type, description, work_id)
        values (
          p_user_id,
          v_token_amount,
          'purchase',
          '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개)',
          'order_' || v_order.id::text
        );
      end if;

      -- 포인트 적립 (결제 금액의 2%)
      select o.total_price into v_points
      from public.orders o
      where o.id = v_order.id;
      v_points := floor(v_points * 0.02);

      if v_points > 0 then
        if not exists (
          select 1 from public.points
          where order_id = v_order.id and type = 'earn'
        ) then
          insert into public.points (user_id, order_id, amount, type, description)
          values (
            p_user_id, v_order.id, v_points, 'earn',
            '토큰 구매 포인트 적립 (2%)'
          );
        end if;
      end if;
    end if;

    v_updated_orders := v_updated_orders || jsonb_build_object(
      'orderId',     v_order.id,
      'orderType',   v_order.order_type,
      'tokenAmount', case when v_order.order_type = 'token' then v_token_amount else null end
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

-- ── B+C. admin_update_order_status: token 완료 처리 순서 및 payment_key 검증 수정 ──
-- SECURITY DEFINER 사유: 관리자 전용 함수이나 호출자(authenticated 역할)는 orders 테이블에
-- 직접 UPDATE 권한이 없고, order_status_logs 테이블에 INSERT 정책이 없어 RLS 우회가 필요하다.
-- 권한 상승 위험 통제: 함수 내부에서 auth.uid() + is_admin() 이중 검증을 수행하며,
-- 모든 상태 변경은 order_status_logs에 감사 로그로 기록된다.
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
  v_is_sample      boolean;
  v_sample_type    text;
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

  -- Lock the row and get current status, order type, price, user
  select o.status, o.order_type, o.total_price, o.user_id, o.payment_key
  into v_current_status, v_order_type, v_total_price, v_user_id, v_payment_key
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  -- custom 주문인 경우 sample 정보 조회
  if v_order_type = 'custom' then
    select
      coalesce((oi.item_data->>'sample')::boolean, false),
      oi.item_data->>'sample_type'
    into v_is_sample, v_sample_type
    from public.order_items oi
    where oi.order_id = p_order_id and oi.item_type = 'custom'
    limit 1;

    if not found then
      raise exception 'custom order has no custom item for order %', p_order_id;
    end if;
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
        -- 기존 rollback
        (v_current_status = '결제중'   and p_new_status = '대기중')
        or (v_current_status = '접수'   and p_new_status = '대기중')
        or (v_current_status = '제작중' and p_new_status = '접수' and not v_is_sample)
        or (v_current_status = '제작중' and p_new_status = '샘플승인' and v_is_sample)
        or (v_current_status = '제작완료' and p_new_status = '제작중')
        -- 샘플 rollback
        or (v_current_status = '샘플원단제작중' and p_new_status = '접수')
        or (v_current_status = '샘플봉제제작중' and p_new_status = '접수'             and v_sample_type = 'sewing')
        or (v_current_status = '샘플봉제제작중' and p_new_status = '샘플원단배송중'   and v_sample_type = 'fabric_and_sewing')
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
        or (p_new_status = '취소' and v_current_status in ('대기중', '결제중', '진행중', '배송중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for sale order', v_current_status, p_new_status;
      end if;
    elsif v_order_type = 'custom' then
      if not (
        -- 공통 전이
        (v_current_status = '대기중'   and p_new_status = '접수')
        or (v_current_status = '제작중'   and p_new_status = '제작완료')
        or (v_current_status = '제작완료' and p_new_status = '배송중')
        or (v_current_status = '배송중'   and p_new_status = '배송완료')
        or (v_current_status = '배송완료' and p_new_status = '완료')
        -- 취소 (모든 샘플 상태 포함)
        or (p_new_status = '취소' and v_current_status in (
          '대기중', '결제중', '접수',
          '샘플원단제작중', '샘플원단배송중', '샘플봉제제작중',
          '샘플넥타이배송중', '샘플배송완료', '샘플승인'
        ))
        -- 비샘플 경로: 접수 → 제작중
        or (v_current_status = '접수' and p_new_status = '제작중' and not v_is_sample)
        -- 샘플 경로 (fabric, fabric_and_sewing)
        or (v_current_status = '접수'           and p_new_status = '샘플원단제작중'   and v_sample_type in ('fabric', 'fabric_and_sewing'))
        or (v_current_status = '샘플원단제작중' and p_new_status = '샘플원단배송중')
        or (v_current_status = '샘플원단배송중' and p_new_status = '샘플배송완료'     and v_sample_type = 'fabric')
        -- 샘플 경로 (sewing)
        or (v_current_status = '접수'           and p_new_status = '샘플봉제제작중'   and v_sample_type = 'sewing')
        -- 샘플 경로 (fabric_and_sewing 중간)
        or (v_current_status = '샘플원단배송중' and p_new_status = '샘플봉제제작중'   and v_sample_type = 'fabric_and_sewing')
        -- 샘플 공통 후반
        or (v_current_status = '샘플봉제제작중'   and p_new_status = '샘플넥타이배송중')
        or (v_current_status = '샘플넥타이배송중' and p_new_status = '샘플배송완료')
        or (v_current_status = '샘플배송완료'     and p_new_status = '샘플승인')
        or (v_current_status = '샘플승인'         and p_new_status = '제작중')
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
    elsif v_order_type = 'token' then
      -- token 순방향: 대기중 → 완료 (payment_key 필수 + 공백 체크), 취소
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
    -- Admin manually confirms purchase: 2% points
    v_points_earned := floor(v_total_price * 0.02);

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
      end if;
    end if;

    update public.orders
    set status       = p_new_status,
        confirmed_at = now()
    where id = p_order_id;

    if v_order_type = 'token' then
      -- design_tokens 부여 (중복 방지: work_id로 idempotent 처리)
      if not exists (select 1 from public.design_tokens where work_id = 'order_' || p_order_id::text) then
        insert into public.design_tokens (user_id, amount, type, description, work_id)
        values (
          v_user_id,
          v_token_amount,
          'purchase',
          '토큰 구매 (' || v_plan_label || ', ' || v_token_amount || '개, 관리자 확정)',
          'order_' || p_order_id::text
        );
      end if;
    end if;

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
