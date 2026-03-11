-- 패키지 보너스 토큰 제거 — base amount로 통합
-- Starter: 30T (변동 없음), Popular: 135T (120+15), Pro: 350T (300+50)

-- 1. 보너스를 base amount에 합산
UPDATE pricing_constants SET amount = amount + (
  SELECT pc2.amount FROM pricing_constants pc2
  WHERE pc2.key = REPLACE(pricing_constants.key, '_amount', '_bonus_amount')
)
WHERE key IN ('token_plan_starter_amount', 'token_plan_popular_amount', 'token_plan_pro_amount');

-- 2. 보너스 키 삭제
DELETE FROM pricing_constants
WHERE key IN ('token_plan_starter_bonus_amount', 'token_plan_popular_bonus_amount', 'token_plan_pro_bonus_amount');

-- 3. get_token_plans — bonus 키 조회 제거 (9개→6개)
CREATE OR REPLACE FUNCTION public.get_token_plans()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object('key', key, 'value', amount::text)
  )
  INTO v_result
  FROM public.pricing_constants
  WHERE key IN (
    'token_plan_starter_price',  'token_plan_starter_amount',
    'token_plan_popular_price',  'token_plan_popular_amount',
    'token_plan_pro_price',      'token_plan_pro_amount'
  );

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 4. create_token_order — bonus_amount 조회/저장 제거
CREATE OR REPLACE FUNCTION public.create_token_order(
  p_plan_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id          uuid;
  v_price_key        text;
  v_amount_key       text;
  v_price            integer;
  v_token_amount     integer;
  v_payment_group_id uuid;
  v_order_number     text;
  v_order_id         uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  -- 플랜 화이트리스트 검증
  IF p_plan_key NOT IN ('starter', 'popular', 'pro') THEN
    RAISE EXCEPTION 'invalid plan_key: %', p_plan_key;
  END IF;

  -- pricing_constants에서 가격/수량 조회
  v_price_key  := 'token_plan_' || p_plan_key || '_price';
  v_amount_key := 'token_plan_' || p_plan_key || '_amount';

  SELECT amount INTO v_price
    FROM public.pricing_constants WHERE key = v_price_key;
  SELECT amount INTO v_token_amount
    FROM public.pricing_constants WHERE key = v_amount_key;

  IF v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'price not configured for plan: %', p_plan_key;
  END IF;
  IF v_token_amount IS NULL OR v_token_amount <= 0 THEN
    RAISE EXCEPTION 'token_amount not configured for plan: %', p_plan_key;
  END IF;

  v_payment_group_id := gen_random_uuid();
  v_order_number     := public.generate_token_order_number();
  v_order_id         := gen_random_uuid();

  INSERT INTO public.orders (
    id, user_id, order_number, shipping_address_id,
    total_price, original_price, total_discount,
    order_type, status, payment_group_id, shipping_cost
  ) VALUES (
    v_order_id, v_user_id, v_order_number, NULL,
    v_price, v_price, 0,
    'token', '대기중', v_payment_group_id, 0
  );

  INSERT INTO public.order_items (
    order_id, item_id, item_type, item_data, quantity, unit_price
  ) VALUES (
    v_order_id, p_plan_key, 'token',
    jsonb_build_object(
      'plan_key',     p_plan_key,
      'token_amount', v_token_amount
    ),
    1, v_price
  );

  RETURN jsonb_build_object(
    'payment_group_id', v_payment_group_id,
    'price',            v_price,
    'token_amount',     v_token_amount
  );
END;
$$;

-- 5. confirm_payment_orders — 보너스 토큰 INSERT 제거
CREATE OR REPLACE FUNCTION public.confirm_payment_orders(
  p_payment_group_id uuid,
  p_user_id          uuid,
  p_payment_key      text
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

    -- token 주문: 토큰 지급 + 포인트 적립 (2%)
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

      -- 포인트 적립 (결제 금액의 2%)
      select o.total_price into v_points
      from public.orders o
      where o.id = v_order.id;
      v_points := floor(v_points * 0.02);

      if v_points > 0 then
        -- ON CONFLICT (order_id, type) DO NOTHING으로 TOCTOU 방지 (idx_points_order_earn)
        insert into public.points (user_id, order_id, amount, type, description)
        values (
          p_user_id, v_order.id, v_points, 'earn',
          '토큰 구매 포인트 적립 (2%)'
        )
        on conflict (order_id, type) do nothing;
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

-- confirm_payment_orders: service_role 전용
REVOKE EXECUTE ON FUNCTION public.confirm_payment_orders(uuid, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_orders(uuid, uuid, text) TO service_role;

-- 6. get_refundable_token_orders — bonus 집계 제거, bonus_tokens_granted 0 고정
CREATE OR REPLACE FUNCTION public.get_refundable_token_orders()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id  uuid;
  v_paid_bal integer;
  v_result   jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  -- 현재 유료 토큰 잔액
  SELECT COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer
    INTO v_paid_bal
    FROM public.design_tokens
   WHERE user_id = v_user_id;

  WITH all_token_orders AS (
    SELECT
      o.id                                              AS order_id,
      o.order_number,
      o.created_at,
      o.total_price,
      COALESCE((
        SELECT SUM(dt.amount)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (dt.work_id = 'order_' || o.id::text || '_paid'
               OR dt.work_id = 'order_' || o.id::text)
      ), 0)::integer                                    AS paid_tokens_granted,
      -- 진행 중인 환불 요청 정보 (pending/approved)
      (
        SELECT jsonb_build_object('id', trr.id, 'status', trr.status)
        FROM public.token_refund_requests trr
        WHERE trr.order_id = o.id
          AND trr.status IN ('pending', 'approved')
        LIMIT 1
      )                                                 AS active_refund_request
    FROM public.orders o
    WHERE o.user_id = v_user_id
      AND o.order_type = 'token'
      AND o.status = '완료'
  ),
  running AS (
    SELECT
      *,
      SUM(paid_tokens_granted) OVER (
        ORDER BY created_at DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS cumulative_paid
    FROM all_token_orders
    WHERE active_refund_request IS NULL
  ),
  refundability AS (
    -- 진행 중 환불이 있는 주문
    SELECT
      ato.order_id,
      ato.order_number,
      ato.created_at,
      ato.total_price,
      ato.paid_tokens_granted,
      0::integer                                        AS bonus_tokens_granted,
      false                                             AS is_refundable,
      CASE (ato.active_refund_request->>'status')
        WHEN 'pending'  THEN 'pending_refund'
        WHEN 'approved' THEN 'approved_refund'
        ELSE 'active_refund'
      END                                               AS not_refundable_reason,
      (ato.active_refund_request->>'id')::uuid          AS pending_request_id
    FROM all_token_orders ato
    WHERE ato.active_refund_request IS NOT NULL

    UNION ALL

    -- LIFO 계산 대상 주문
    SELECT
      r.order_id,
      r.order_number,
      r.created_at,
      r.total_price,
      r.paid_tokens_granted,
      0::integer                                        AS bonus_tokens_granted,
      (r.cumulative_paid <= v_paid_bal AND r.paid_tokens_granted > 0) AS is_refundable,
      CASE
        WHEN r.paid_tokens_granted = 0 THEN 'no_paid_tokens'
        WHEN r.cumulative_paid > v_paid_bal THEN 'tokens_used'
        ELSE NULL
      END                                               AS not_refundable_reason,
      NULL::uuid                                        AS pending_request_id
    FROM running r
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_id',              rf.order_id,
      'order_number',          rf.order_number,
      'created_at',            rf.created_at,
      'total_price',           rf.total_price,
      'paid_tokens_granted',   rf.paid_tokens_granted,
      'bonus_tokens_granted',  rf.bonus_tokens_granted,
      'is_refundable',         rf.is_refundable,
      'not_refundable_reason', rf.not_refundable_reason,
      'pending_request_id',    rf.pending_request_id
    )
    ORDER BY rf.created_at DESC
  )
  INTO v_result
  FROM refundability rf;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 7. request_token_refund — v_bonus_granted 제거, bonus_token_amount 0 고정
CREATE OR REPLACE FUNCTION public.request_token_refund(
  p_order_id uuid,
  p_reason   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id       uuid;
  v_order         record;
  v_paid_granted  integer;
  v_paid_bal      integer;
  v_request_id    uuid;
  v_refund_amount integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  -- 주문 검증: 본인 소유 + 토큰 주문 + 완료 상태
  SELECT id, user_id, total_price, order_type, status
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  IF v_order.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Forbidden: order not owned by user';
  END IF;

  IF v_order.order_type != 'token' THEN
    RAISE EXCEPTION 'only token orders can be refunded';
  END IF;

  IF v_order.status != '완료' THEN
    RAISE EXCEPTION 'order is not in completed status (status: %)', v_order.status;
  END IF;

  -- 해당 주문의 유료 지급량 조회
  SELECT
    COALESCE((
      SELECT SUM(dt.amount)
      FROM public.design_tokens dt
      WHERE dt.user_id = v_user_id
        AND dt.type = 'purchase'
        AND dt.token_class = 'paid'
        AND (dt.work_id = 'order_' || p_order_id::text || '_paid'
             OR dt.work_id = 'order_' || p_order_id::text)
    ), 0)::integer
  INTO v_paid_granted;

  IF v_paid_granted <= 0 THEN
    RAISE EXCEPTION 'no paid tokens found for this order';
  END IF;

  -- 현재 유료 잔액 조회
  SELECT COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer
    INTO v_paid_bal
    FROM public.design_tokens
   WHERE user_id = v_user_id;

  -- 전액 환불 가능 여부: 현재 유료 잔액 >= 해당 주문 유료 지급량
  IF v_paid_bal < v_paid_granted THEN
    RAISE EXCEPTION 'insufficient paid tokens for refund: balance=%, required=%', v_paid_bal, v_paid_granted;
  END IF;

  v_refund_amount := v_order.total_price;
  v_request_id   := gen_random_uuid();

  -- 환불 요청 등록 (pending) — UNIQUE INDEX가 중복 방지
  INSERT INTO public.token_refund_requests (
    id, user_id, order_id,
    paid_token_amount, bonus_token_amount,
    refund_amount, status, reason
  ) VALUES (
    v_request_id, v_user_id, p_order_id,
    v_paid_granted, 0,
    v_refund_amount, 'pending', p_reason
  );

  RETURN jsonb_build_object(
    'request_id',         v_request_id,
    'refund_amount',      v_refund_amount,
    'paid_token_amount',  v_paid_granted,
    'bonus_token_amount', 0
  );
END;
$$;

-- 8. approve_token_refund — 보너스 회수 블록 제거
CREATE OR REPLACE FUNCTION public.approve_token_refund(
  p_request_id uuid,
  p_admin_id   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
  v_req         record;
  v_earn_points integer;
BEGIN
  -- service_role 전용
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: approve_token_refund requires service_role';
  END IF;

  SELECT id, user_id, order_id, paid_token_amount, bonus_token_amount, status
    INTO v_req
    FROM public.token_refund_requests
   WHERE id = p_request_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund request not found';
  END IF;

  IF v_req.status != 'pending' THEN
    RAISE EXCEPTION 'refund request is not pending (status: %)', v_req.status;
  END IF;

  -- 유료 토큰 회수
  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, description, work_id
  ) VALUES (
    v_req.user_id, -v_req.paid_token_amount, 'refund', 'paid',
    '토큰 환불 승인 (유료)',
    'refund_' || p_request_id::text || '_paid'
  )
  ON CONFLICT (work_id) DO NOTHING;

  -- 보너스 토큰 회수 (기존 데이터 호환: bonus_token_amount > 0인 경우만)
  IF v_req.bonus_token_amount > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, description, work_id
    ) VALUES (
      v_req.user_id, -v_req.bonus_token_amount, 'refund', 'bonus',
      '토큰 환불 승인 (보너스)',
      'refund_' || p_request_id::text || '_bonus'
    )
    ON CONFLICT (work_id) DO NOTHING;
  END IF;

  -- 포인트 회수: 해당 주문의 earn 포인트 역삽입
  SELECT COALESCE(SUM(p.amount), 0)::integer
    INTO v_earn_points
    FROM public.points p
   WHERE p.order_id = v_req.order_id AND p.type = 'earn';

  IF v_earn_points > 0 THEN
    INSERT INTO public.points (user_id, order_id, amount, type, description)
    VALUES (
      v_req.user_id, v_req.order_id, -v_earn_points, 'admin',
      '토큰 환불로 인한 포인트 회수'
    )
    ON CONFLICT (order_id, type) DO NOTHING;
  END IF;

  -- 주문 취소 처리 (전액 환불이므로 항상 취소)
  UPDATE public.orders
     SET status = '취소', updated_at = now()
   WHERE id = v_req.order_id;

  INSERT INTO public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) VALUES (
    v_req.order_id, p_admin_id, '완료', '취소',
    '토큰 환불 승인 (request_id: ' || p_request_id::text || ')'
  );

  -- 환불 요청 상태 업데이트
  UPDATE public.token_refund_requests
     SET status       = 'approved',
         processed_by = p_admin_id,
         processed_at = now(),
         updated_at   = now()
   WHERE id = p_request_id;
END;
$$;

-- approve_token_refund: service_role 전용
REVOKE EXECUTE ON FUNCTION public.approve_token_refund(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_token_refund(uuid, uuid) TO service_role;
