-- =============================================================
-- 20260318000000_token_refund_and_bonus.sql
-- 토큰 환불 정책 + 보너스 토큰 도입
-- =============================================================

-- ── Phase 1-1: design_tokens에 token_class 컬럼 추가 ──────────
ALTER TABLE public.design_tokens
  ADD COLUMN token_class text NOT NULL DEFAULT 'paid'
    CHECK (token_class IN ('paid', 'bonus', 'free'));

-- 기존 grant 레코드를 'free'로 설정 (신규 가입 무료 지급)
UPDATE public.design_tokens SET token_class = 'free' WHERE type = 'grant';

-- 성능 인덱스
CREATE INDEX idx_design_tokens_user_class
  ON public.design_tokens (user_id, token_class);

-- ── Phase 1-2: token_refund_requests 테이블 생성 ─────────────
CREATE TABLE public.token_refund_requests (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id           uuid        NOT NULL REFERENCES public.orders(id),
  paid_token_amount  integer     NOT NULL CHECK (paid_token_amount > 0),
  bonus_token_amount integer     NOT NULL DEFAULT 0,
  refund_amount      integer     NOT NULL CHECK (refund_amount > 0),
  status             text        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason             text,
  admin_memo         text,
  processed_by       uuid        REFERENCES auth.users(id),
  processed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 동일 주문에 pending 중복 방지
CREATE UNIQUE INDEX idx_token_refund_pending_order
  ON public.token_refund_requests (order_id) WHERE status = 'pending';
CREATE INDEX idx_token_refund_user
  ON public.token_refund_requests (user_id, created_at DESC);
CREATE INDEX idx_token_refund_status
  ON public.token_refund_requests (status) WHERE status = 'pending';

-- RLS: SELECT(본인+관리자), INSERT/UPDATE는 RPC 전용
ALTER TABLE public.token_refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own refund requests"
  ON public.token_refund_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all refund requests"
  ON public.token_refund_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── Phase 1-3: admin_settings에 보너스 토큰 키 추가 ──────────
INSERT INTO public.admin_settings (key, value) VALUES
  ('token_plan_starter_bonus_amount', '0'),
  ('token_plan_popular_bonus_amount', '15'),
  ('token_plan_pro_bonus_amount',     '50')
ON CONFLICT (key) DO NOTHING;

-- ── Phase 2-1: grant_initial_design_tokens 트리거 함수 수정 ──
-- token_class='free' 명시
CREATE OR REPLACE FUNCTION public.grant_initial_design_tokens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_amount integer;
BEGIN
  SELECT CASE
    WHEN value ~ '^[0-9]+$' AND value::integer >= 1 THEN value::integer
    ELSE 30
  END
  INTO v_amount
  FROM public.admin_settings
  WHERE key = 'design_token_initial_grant';

  IF v_amount IS NULL THEN
    v_amount := 30;
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, token_class, description)
  VALUES (NEW.id, v_amount, 'grant', 'free', '신규 가입 토큰 지급');

  RETURN NEW;
END;
$$;

-- ── Phase 2-2: get_design_token_balance 수정 ─────────────────
-- total/paid/bonus 분리 반환 (jsonb)
-- 반환 타입 변경 (integer → jsonb)이므로 DROP 후 재생성
DROP FUNCTION IF EXISTS public.get_design_token_balance();
CREATE OR REPLACE FUNCTION public.get_design_token_balance()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(amount), 0)::integer,
    'paid',  COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer,
    'bonus', COALESCE(SUM(amount) FILTER (WHERE token_class IN ('bonus', 'free')), 0)::integer
  )
  FROM public.design_tokens
  WHERE user_id = auth.uid();
$$;

-- ── Phase 2-3: use_design_tokens 수정 ────────────────────────
-- pending 환불 체크 + 유료/보너스 분리 차감
CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id      uuid,
  p_ai_model     text,
  p_request_type text,
  p_quality      text DEFAULT 'standard'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cost_key    text;
  v_cost        integer;
  v_paid_bal    integer;
  v_bonus_bal   integer;
  v_total_bal   integer;
  v_paid_deduct integer;
  v_bonus_deduct integer;
  v_caller_role text;
BEGIN
  -- 소유권 검증
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  -- 파라미터 화이트리스트 검증
  IF p_ai_model NOT IN ('openai', 'gemini') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;
  IF p_request_type NOT IN ('text_only', 'text_and_image') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;
  IF p_quality NOT IN ('standard', 'high') THEN
    RAISE EXCEPTION 'invalid quality: %', p_quality;
  END IF;

  -- 동시 요청에 대한 advisory lock (사용자별)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- admin_settings에서 비용 조회
  v_cost_key := CASE
    WHEN p_request_type = 'text_and_image' AND p_quality = 'high'
      THEN 'design_token_cost_' || p_ai_model || '_image_high'
    ELSE
      'design_token_cost_' || p_ai_model || '_' ||
      CASE p_request_type
        WHEN 'text_and_image' THEN 'image'
        ELSE 'text'
      END
  END;

  SELECT value::integer
    INTO v_cost
    FROM public.admin_settings
   WHERE key = v_cost_key;

  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'cost not configured for key: %', v_cost_key;
  END IF;

  -- pending 환불 체크 (환불 신청 후 토큰 사용 차단)
  IF EXISTS (
    SELECT 1 FROM public.token_refund_requests
    WHERE user_id = p_user_id AND status = 'pending'
  ) THEN
    SELECT COALESCE(SUM(amount), 0)::integer
      INTO v_total_bal
      FROM public.design_tokens
     WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'refund_pending',
      'balance', v_total_bal,
      'cost', v_cost
    );
  END IF;

  -- 유료/보너스 잔액 분리 조회
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer,
    COALESCE(SUM(amount) FILTER (WHERE token_class IN ('bonus', 'free')), 0)::integer
  INTO v_paid_bal, v_bonus_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id;

  v_total_bal := v_paid_bal + v_bonus_bal;

  -- 잔액 부족 검사
  IF v_total_bal < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'balance', v_total_bal,
      'cost', v_cost
    );
  END IF;

  -- 유료 먼저 차감, 부족분은 보너스에서
  v_paid_deduct  := LEAST(v_cost, v_paid_bal);
  v_bonus_deduct := v_cost - v_paid_deduct;

  -- 유료 차감
  IF v_paid_deduct > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description
    ) VALUES (
      p_user_id, -v_paid_deduct, 'use', 'paid',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 유료'
    );
  END IF;

  -- 보너스 차감
  IF v_bonus_deduct > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description
    ) VALUES (
      p_user_id, -v_bonus_deduct, 'use', 'bonus',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 보너스'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cost', v_cost,
    'balance', v_total_bal - v_cost
  );
END;
$$;

-- ── Phase 2-4: get_token_plans 수정 (보너스 키 포함) ──────────
CREATE OR REPLACE FUNCTION public.get_token_plans()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object('key', key, 'value', value)
  )
  INTO v_result
  FROM public.admin_settings
  WHERE key IN (
    'token_plan_starter_price',        'token_plan_starter_amount',  'token_plan_starter_bonus_amount',
    'token_plan_popular_price',        'token_plan_popular_amount',  'token_plan_popular_bonus_amount',
    'token_plan_pro_price',            'token_plan_pro_amount',      'token_plan_pro_bonus_amount'
  );

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ── Phase 2-5: create_token_order 수정 (bonus_amount 저장) ────
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
  v_bonus_key        text;
  v_price            integer;
  v_token_amount     integer;
  v_bonus_amount     integer;
  v_payment_group_id uuid;
  v_order_number     text;
  v_order_id         uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  IF p_plan_key NOT IN ('starter', 'popular', 'pro') THEN
    RAISE EXCEPTION 'invalid plan_key: %', p_plan_key;
  END IF;

  v_price_key  := 'token_plan_' || p_plan_key || '_price';
  v_amount_key := 'token_plan_' || p_plan_key || '_amount';
  v_bonus_key  := 'token_plan_' || p_plan_key || '_bonus_amount';

  SELECT value::integer INTO v_price
    FROM public.admin_settings WHERE key = v_price_key;
  SELECT value::integer INTO v_token_amount
    FROM public.admin_settings WHERE key = v_amount_key;
  SELECT COALESCE(value::integer, 0) INTO v_bonus_amount
    FROM public.admin_settings WHERE key = v_bonus_key;

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
      'token_amount', v_token_amount,
      'bonus_amount', v_bonus_amount
    ),
    1, v_price
  );

  RETURN jsonb_build_object(
    'payment_group_id', v_payment_group_id,
    'price',            v_price,
    'token_amount',     v_token_amount,
    'bonus_amount',     v_bonus_amount
  );
END;
$$;

-- ── Phase 2-6: confirm_payment_orders 수정 (유료/보너스 분리) ─
CREATE OR REPLACE FUNCTION public.confirm_payment_orders(
  p_payment_group_id uuid,
  p_user_id uuid,
  p_payment_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_order record;
  v_post_status text;
  v_updated_orders jsonb := '[]'::jsonb;
  v_count int := 0;
  v_masked_key text;
  v_token_amount integer;
  v_bonus_amount integer;
  v_plan_key text;
  v_plan_label text;
  v_points integer;
begin
  if p_user_id is null then
    raise exception 'Forbidden';
  end if;

  if p_payment_key is null or trim(p_payment_key) = '' then
    raise exception 'payment_key is required';
  end if;

  if auth.uid() is not null and p_user_id is distinct from auth.uid() then
    raise exception 'Forbidden';
  end if;

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

    -- token 주문: 유료/보너스 분리 지급 + 포인트 적립 (2%)
    if v_order.order_type = 'token' then
      select
        (oi.item_data->>'token_amount')::integer,
        COALESCE((oi.item_data->>'bonus_amount')::integer, 0),
        oi.item_data->>'plan_key'
      into v_token_amount, v_bonus_amount, v_plan_key
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

      -- 유료 토큰 지급
      insert into public.design_tokens (user_id, amount, type, token_class, description, work_id)
      values (
        p_user_id,
        v_token_amount,
        'purchase',
        'paid',
        '토큰 구매 (' || v_plan_label || ', 유료 ' || v_token_amount || '개)',
        'order_' || v_order.id::text || '_paid'
      )
      on conflict (work_id) do nothing;

      -- 보너스 토큰 지급 (보너스 > 0인 경우만)
      if v_bonus_amount > 0 then
        insert into public.design_tokens (user_id, amount, type, token_class, description, work_id)
        values (
          p_user_id,
          v_bonus_amount,
          'purchase',
          'bonus',
          '토큰 구매 보너스 (' || v_plan_label || ', 보너스 ' || v_bonus_amount || '개)',
          'order_' || v_order.id::text || '_bonus'
        )
        on conflict (work_id) do nothing;
      end if;

      -- 포인트 적립 (결제 금액의 2%)
      select o.total_price into v_points
      from public.orders o
      where o.id = v_order.id;
      v_points := floor(v_points * 0.02);

      if v_points > 0 then
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
      'tokenAmount', case when v_order.order_type = 'token' then v_token_amount else null end,
      'bonusAmount', case when v_order.order_type = 'token' then v_bonus_amount else null end
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

-- confirm_payment_orders: service_role 전용 (권한 재설정)
REVOKE EXECUTE ON FUNCTION public.confirm_payment_orders(uuid, uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_orders(uuid, uuid, text) TO service_role;

-- ── Phase 2-7: get_refundable_token_orders ────────────────────
-- 환불 가능한 토큰 주문 목록 조회 (고객용, SECURITY INVOKER)
-- SECURITY INVOKER: 소유자 데이터만 조회하므로 RLS로 충분
CREATE OR REPLACE FUNCTION public.get_refundable_token_orders()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id    uuid;
  v_paid_bal   integer;
  v_result     jsonb;
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

  -- LIFO 방식으로 환불 가능 여부 판정
  WITH paid_orders AS (
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
      COALESCE((
        SELECT SUM(dt.amount)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'bonus'
          AND dt.work_id = 'order_' || o.id::text || '_bonus'
      ), 0)::integer                                    AS bonus_tokens_granted
    FROM public.orders o
    WHERE o.user_id = v_user_id
      AND o.order_type = 'token'
      AND o.status = '완료'
      AND NOT EXISTS (
        SELECT 1 FROM public.token_refund_requests trr
        WHERE trr.order_id = o.id
          AND trr.status IN ('pending', 'approved')
      )
  ),
  running AS (
    SELECT
      *,
      SUM(paid_tokens_granted) OVER (
        ORDER BY created_at DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS cumulative_paid
    FROM paid_orders
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_id',            r.order_id,
      'order_number',        r.order_number,
      'created_at',          r.created_at,
      'total_price',         r.total_price,
      'paid_tokens_granted', r.paid_tokens_granted,
      'bonus_tokens_granted',r.bonus_tokens_granted,
      'is_refundable',       (r.cumulative_paid <= v_paid_bal AND r.paid_tokens_granted > 0)
    )
    ORDER BY r.created_at DESC
  )
  INTO v_result
  FROM running r;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ── Phase 2-8: request_token_refund ──────────────────────────
-- 환불 신청 (고객용)
-- SECURITY DEFINER 사유: token_refund_requests INSERT는 RLS로 허용되지 않음
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
  v_user_id          uuid;
  v_order            record;
  v_paid_granted     integer;
  v_bonus_granted    integer;
  v_paid_bal         integer;
  v_request_id       uuid;
  v_refund_amount    integer;
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

  -- 해당 주문의 유료/보너스 지급량 조회
  SELECT
    COALESCE((
      SELECT SUM(dt.amount)
      FROM public.design_tokens dt
      WHERE dt.user_id = v_user_id
        AND dt.type = 'purchase'
        AND dt.token_class = 'paid'
        AND (dt.work_id = 'order_' || p_order_id::text || '_paid'
             OR dt.work_id = 'order_' || p_order_id::text)
    ), 0)::integer,
    COALESCE((
      SELECT SUM(dt.amount)
      FROM public.design_tokens dt
      WHERE dt.user_id = v_user_id
        AND dt.type = 'purchase'
        AND dt.token_class = 'bonus'
        AND dt.work_id = 'order_' || p_order_id::text || '_bonus'
    ), 0)::integer
  INTO v_paid_granted, v_bonus_granted;

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
    v_paid_granted, v_bonus_granted,
    v_refund_amount, 'pending', p_reason
  );

  RETURN jsonb_build_object(
    'request_id',       v_request_id,
    'refund_amount',    v_refund_amount,
    'paid_token_amount', v_paid_granted,
    'bonus_token_amount', v_bonus_granted
  );
END;
$$;

-- ── Phase 2-9: cancel_token_refund ───────────────────────────
-- 환불 취소 (고객용)
-- SECURITY DEFINER 사유: token_refund_requests UPDATE는 RLS로 허용되지 않음
CREATE OR REPLACE FUNCTION public.cancel_token_refund(
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_req     record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  SELECT id, user_id, status
    INTO v_req
    FROM public.token_refund_requests
   WHERE id = p_request_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund request not found';
  END IF;

  IF v_req.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Forbidden: refund request not owned by user';
  END IF;

  IF v_req.status != 'pending' THEN
    RAISE EXCEPTION 'only pending requests can be cancelled (status: %)', v_req.status;
  END IF;

  UPDATE public.token_refund_requests
     SET status = 'cancelled', updated_at = now()
   WHERE id = p_request_id;
END;
$$;

-- ── Phase 2-10: approve_token_refund ─────────────────────────
-- 관리자 환불 승인 (service_role 전용, Edge Function에서 호출)
-- SECURITY DEFINER 사유: design_tokens/orders/points INSERT/UPDATE는 RLS 비허용
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

  -- 보너스 토큰 회수 (있는 경우만)
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

-- ── Phase 2-11: reject_token_refund_admin ────────────────────
-- 관리자 환불 거절 (is_admin 검증)
-- SECURITY DEFINER 사유: token_refund_requests UPDATE는 RLS 비허용
CREATE OR REPLACE FUNCTION public.reject_token_refund_admin(
  p_request_id uuid,
  p_admin_memo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  SELECT id, status
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

  UPDATE public.token_refund_requests
     SET status       = 'rejected',
         admin_memo   = p_admin_memo,
         processed_by = auth.uid(),
         processed_at = now(),
         updated_at   = now()
   WHERE id = p_request_id;
END;
$$;

-- ── Phase 2-12: get_token_refund_requests_admin ───────────────
-- 관리자 환불 요청 목록 조회 (is_admin 검증)
-- SECURITY DEFINER 사유: token_refund_requests/orders는 일반 유저 full SELECT 비허용
CREATE OR REPLACE FUNCTION public.get_token_refund_requests_admin(
  p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'approved', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'invalid status filter: %', p_status;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',                 trr.id,
      'user_id',            trr.user_id,
      'order_id',           trr.order_id,
      'order_number',       o.order_number,
      'paid_token_amount',  trr.paid_token_amount,
      'bonus_token_amount', trr.bonus_token_amount,
      'refund_amount',      trr.refund_amount,
      'status',             trr.status,
      'reason',             trr.reason,
      'admin_memo',         trr.admin_memo,
      'processed_by',       trr.processed_by,
      'processed_at',       trr.processed_at,
      'created_at',         trr.created_at,
      'payment_key',        o.payment_key
    )
    ORDER BY trr.created_at DESC
  )
  INTO v_result
  FROM public.token_refund_requests trr
  JOIN public.orders o ON o.id = trr.order_id
  WHERE (p_status IS NULL OR trr.status = p_status);

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
