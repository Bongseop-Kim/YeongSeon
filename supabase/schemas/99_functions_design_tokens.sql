-- =============================================================
-- 99_functions_design_tokens.sql  –  Design token RPC functions
-- =============================================================

-- ── get_design_token_balance ──────────────────────────────────
-- Returns the current token balance breakdown for the authenticated user.
-- Returns: { total, paid, bonus }
CREATE OR REPLACE FUNCTION public.get_design_token_balance()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total', (COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0) + COALESCE(SUM(amount) FILTER (WHERE token_class = 'bonus'), 0))::integer,
    'paid',  COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer,
    'bonus', COALESCE(SUM(amount) FILTER (WHERE token_class = 'bonus'), 0)::integer
  )
  FROM public.design_tokens
  WHERE user_id = auth.uid();
$$;

-- ── use_design_tokens ─────────────────────────────────────────
-- Deducts tokens for a design generation request.
-- SECURITY DEFINER 유지 사유: advisory lock + design_tokens INSERT는 RLS로 허용되지 않음
-- service_role(Edge Function)에서 호출 시 소유권 검증 면제
-- 차감 순서: 유료 먼저, 부족분은 보너스에서
-- Returns: { success, cost, balance } or { success: false, error: '...', balance, cost }
CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id      uuid,
  p_ai_model     text,             -- 'openai' | 'gemini'
  p_request_type text,            -- 'text_only' | 'text_and_image'
  p_quality      text DEFAULT 'standard'  -- 'high' | 'standard'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cost_key     text;
  v_cost         integer;
  v_total_bal    integer;
  v_paid_bal     integer;
  v_bonus_bal    integer;
  v_caller_role  text;
  v_paid_to_use  integer;
BEGIN
  -- 소유권 검증: service_role이 아닌 경우 auth.uid() 일치 확인
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
  IF p_request_type = 'text_only' AND p_quality = 'high' THEN
    RAISE EXCEPTION 'unsupported combination: text_only with high quality is not supported';
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
    SELECT 1 FROM public.claims
    WHERE user_id = p_user_id
      AND type = 'token_refund'
      AND status = '접수'
  ) THEN
    SELECT COALESCE(SUM(amount) FILTER (WHERE token_class IN ('paid', 'bonus')), 0)::integer
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

  -- 클래스별 잔액 조회
  SELECT COALESCE(SUM(amount), 0)::integer
  INTO v_paid_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id AND token_class = 'paid';

  SELECT COALESCE(SUM(amount), 0)::integer
  INTO v_bonus_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id AND token_class = 'bonus';

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

  -- paid 먼저 차감, 부족분은 bonus에서 차감
  v_paid_to_use := least(greatest(v_paid_bal, 0), v_cost);

  IF v_paid_to_use > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description
    ) VALUES (
      p_user_id, -v_paid_to_use, 'use', 'paid',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
    );
  END IF;
  IF v_cost - v_paid_to_use > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description
    ) VALUES (
      p_user_id, -(v_cost - v_paid_to_use), 'use', 'bonus',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cost', v_cost,
    'balance', v_total_bal - v_cost
  );
END;
$$;

-- ── refund_design_tokens ──────────────────────────────────────
-- Refunds tokens when image generation fails after text succeeds.
-- SECURITY DEFINER 유지 사유: design_tokens INSERT는 RLS로 허용되지 않음
-- service_role 전용이며 work_id 기반 멱등성으로 중복 환불을 방지함
CREATE OR REPLACE FUNCTION public.refund_design_tokens(
  p_user_id      uuid,
  p_amount       integer,
  p_ai_model     text,
  p_request_type text,
  p_work_id      text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
BEGIN
  -- service_role 전용: 클라이언트 직접 호출 차단
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: refund requires service_role';
  END IF;

  IF p_amount <= 0 THEN
    RETURN;
  END IF;

  -- work_id 기반 멱등성: 동일 work_id로 이미 환불된 경우 무시
  INSERT INTO public.design_tokens (user_id, amount, type, token_class, ai_model, request_type, description, work_id)
  VALUES (
    p_user_id,
    p_amount,
    'refund',
    'paid',  -- 이미지 생성 실패 환불은 유료 토큰 반환
    p_ai_model,
    p_request_type,
    '이미지 생성 실패 환불 (' || p_ai_model || ')',
    p_work_id
  )
  ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
END;
$$;

-- ── manage_design_tokens_admin ───────────────────────────────
-- Admin-only grant/deduction for design tokens with audit trail.
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

  SELECT COALESCE(SUM(amount), 0)::integer
    INTO v_balance
    FROM public.design_tokens
   WHERE user_id = p_user_id;

  IF p_amount < 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

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

-- ── get_token_plans ───────────────────────────────────────────
-- Returns token plan prices/amounts/bonus for store users.
-- pricing_constants는 public read이므로 SECURITY INVOKER로 충분
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

-- ── create_token_order ────────────────────────────────────────
-- Creates a pending token order in the orders/order_items tables.
-- SECURITY DEFINER 사유: orders/order_items INSERT는 RLS로 허용되지 않음
-- pricing_constants는 public read이므로 별도 권한 불필요
-- auth.uid() 소유권 검증으로 무단 접근 차단
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

-- ── get_design_token_balances_admin ──────────────────────────
-- Admin-only batch balance lookup for up to 100 users.
CREATE OR REPLACE FUNCTION public.get_design_token_balances_admin(
  p_user_ids uuid[]
)
RETURNS TABLE(user_id uuid, balance integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  IF array_length(p_user_ids, 1) > 100 THEN
    RAISE EXCEPTION 'too many user_ids: max 100';
  END IF;

  RETURN QUERY
  WITH requested_users AS (
    SELECT DISTINCT unnest(COALESCE(p_user_ids, ARRAY[]::uuid[])) AS user_id
  ),
  balances AS (
    SELECT dt.user_id, COALESCE(SUM(dt.amount), 0)::integer AS balance
    FROM public.design_tokens AS dt
    JOIN requested_users AS ru
      ON ru.user_id = dt.user_id
    GROUP BY dt.user_id
  )
  SELECT ru.user_id, COALESCE(b.balance, 0)::integer AS balance
  FROM requested_users AS ru
  LEFT JOIN balances AS b
    ON b.user_id = ru.user_id;
END;
$$;

-- ── get_refundable_token_orders ───────────────────────────────
-- 모든 완료된 토큰 주문 목록 + 환불 가능 여부 + 불가 사유 반환 (고객용)
-- SECURITY INVOKER: 소유자 데이터만 조회하므로 RLS로 충분
CREATE OR REPLACE FUNCTION public.get_refundable_token_orders()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_result  jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  WITH completed_token_orders AS (
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
        SELECT MAX(dt.created_at)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (dt.work_id = 'order_' || o.id::text || '_paid'
               OR dt.work_id = 'order_' || o.id::text)
      ), o.created_at)                                  AS token_granted_at,
      -- 진행 중인 환불 요청 정보 (접수/완료)
      (
        SELECT jsonb_build_object('id', c.id, 'status', c.status)
        FROM public.claims c
        WHERE c.order_id = o.id
          AND c.type = 'token_refund'
          AND c.status IN ('접수', '완료')
        LIMIT 1
      )                                                 AS active_refund_request
    FROM public.orders o
    WHERE o.user_id = v_user_id
      AND o.order_type = 'token'
      AND o.status = '완료'
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_id',              cto.order_id,
      'order_number',          cto.order_number,
      'created_at',            cto.created_at,
      'total_price',           cto.total_price,
      'paid_tokens_granted',   cto.paid_tokens_granted,
      'bonus_tokens_granted',  0,
      'is_refundable',         CASE
                                 WHEN cto.active_refund_request IS NOT NULL THEN false
                                 WHEN cto.order_rank = 1
                                   AND NOT EXISTS (
                                     SELECT 1
                                     FROM public.design_tokens dt
                                     WHERE dt.user_id = v_user_id
                                       AND dt.type = 'use'
                                       AND dt.created_at > cto.token_granted_at
                                   ) THEN true
                                 ELSE false
                               END,
      'not_refundable_reason', CASE
                                 WHEN cto.active_refund_request IS NOT NULL THEN
                                   CASE (cto.active_refund_request->>'status')
                                     WHEN '접수' THEN 'pending_refund'
                                     WHEN '완료' THEN 'approved_refund'
                                     ELSE 'active_refund'
                                   END
                                 WHEN cto.order_rank = 1
                                   AND NOT EXISTS (
                                     SELECT 1
                                     FROM public.design_tokens dt
                                     WHERE dt.user_id = v_user_id
                                       AND dt.type = 'use'
                                       AND dt.created_at > cto.token_granted_at
                                   ) THEN NULL
                                 ELSE 'tokens_used'
                               END,
      'pending_request_id',    CASE
                                 WHEN cto.active_refund_request IS NOT NULL
                                   THEN (cto.active_refund_request->>'id')::uuid
                                 ELSE NULL::uuid
                               END
    )
    ORDER BY cto.created_at DESC
  )
  INTO v_result
  FROM (
    SELECT
      cto.*,
      RANK() OVER (ORDER BY cto.created_at DESC, cto.order_id DESC) AS order_rank
    FROM completed_token_orders cto
  ) cto;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ── request_token_refund ──────────────────────────────────────
-- 환불 신청 (고객용)
-- SECURITY DEFINER 사유: claims INSERT는 RPC 전용 (auth.uid() 소유권 검증 포함)
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
  v_user_id         uuid;
  v_order           record;
  v_latest_order_id uuid;
  v_paid_granted    integer;
  v_token_granted_at timestamptz;
  v_refund_amount   integer;
  v_token_item_id   uuid;
  v_claim_id        uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- 주문 검증: 본인 소유 + 토큰 주문 + 완료 상태
  SELECT id, user_id, total_price, order_type, status, created_at
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     AND user_id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
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

  SELECT MAX(dt.created_at)
    INTO v_token_granted_at
    FROM public.design_tokens dt
   WHERE dt.user_id = v_user_id
     AND dt.type = 'purchase'
     AND dt.token_class = 'paid'
     AND (dt.work_id = 'order_' || p_order_id::text || '_paid'
          OR dt.work_id = 'order_' || p_order_id::text);

  v_token_granted_at := COALESCE(v_token_granted_at, v_order.created_at);

  SELECT id
    INTO v_latest_order_id
    FROM public.orders
   WHERE user_id = v_user_id
     AND order_type = 'token'
     AND status = '완료'
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  IF v_latest_order_id IS DISTINCT FROM p_order_id THEN
    RAISE EXCEPTION 'not the latest order';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.design_tokens dt
    WHERE dt.user_id = v_user_id
      AND dt.type = 'use'
      AND dt.created_at > v_token_granted_at
  ) THEN
    RAISE EXCEPTION 'tokens_used_after_order';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.claims
    WHERE order_id = p_order_id
      AND type = 'token_refund'
      AND status NOT IN ('거부')
  ) THEN
    RAISE EXCEPTION 'duplicate_refund_request: active refund already exists for this order';
  END IF;

  v_refund_amount := v_order.total_price;

  -- token order_item id 조회
  SELECT oi.id INTO v_token_item_id
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id
    AND oi.item_type = 'token'
  ORDER BY oi.created_at
  LIMIT 1;

  IF v_token_item_id IS NULL THEN
    RAISE EXCEPTION '토큰 주문 항목을 찾을 수 없습니다.';
  END IF;

  INSERT INTO public.claims (
    user_id, order_id, order_item_id,
    claim_number, type, status,
    reason, quantity, refund_data
  )
  VALUES (
    v_user_id,
    p_order_id,
    v_token_item_id,
    'TKR-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || SUBSTR(gen_random_uuid()::text, 1, 4),
    'token_refund',
    '접수',
    COALESCE(p_reason, '토큰 환불 요청'),
    1,
    jsonb_build_object(
      'paid_token_amount', v_paid_granted,
      'bonus_token_amount', 0,
      'refund_amount',      v_refund_amount
    )
  )
  RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object(
    'request_id',         v_claim_id,
    'refund_amount',      v_refund_amount,
    'paid_token_amount',  v_paid_granted,
    'bonus_token_amount', 0
  );
END;
$$;

-- ── cancel_token_refund ───────────────────────────────────────
-- 환불 취소 (고객용)
-- SECURITY DEFINER 사유: claims UPDATE는 RLS로 허용되지 않음
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

  SELECT c.id, c.user_id, c.status
    INTO v_req
    FROM public.claims c
   WHERE c.id = p_request_id
     AND c.type = 'token_refund'
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund request not found';
  END IF;

  IF v_req.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Forbidden: refund request not owned by user';
  END IF;

  IF v_req.status != '접수' THEN
    RAISE EXCEPTION 'only pending requests can be cancelled (status: %)', v_req.status;
  END IF;

  UPDATE public.claims
     SET status = '거부',
         updated_at = now()
   WHERE id = p_request_id
     AND type = 'token_refund';
END;
$$;

-- ── approve_token_refund ──────────────────────────────────────
-- 관리자 환불 승인 (service_role 전용, Edge Function에서 Toss 취소 후 호출)
-- SECURITY DEFINER 사유: design_tokens/orders INSERT/UPDATE는 RLS 비허용
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
  v_caller_role       text;
  v_req               record;
  v_paid_token_amount integer;
  v_order_status      text;
BEGIN
  -- service_role 전용
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: approve_token_refund requires service_role';
  END IF;

  SELECT c.id, c.user_id, c.order_id,
         (c.refund_data->>'paid_token_amount')::int AS paid_token_amount,
         (c.refund_data->>'bonus_token_amount')::int AS bonus_token_amount,
         c.status
    INTO v_req
    FROM public.claims c
   WHERE c.id = p_request_id
     AND c.type = 'token_refund'
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund request not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_req.user_id::text));

  -- 이미 완료된 경우 멱등하게 성공 반환
  IF v_req.status = '완료' THEN
    RETURN;
  END IF;

  -- 접수 상태만 허용 (처리중 중간 상태 없음)
  IF v_req.status != '접수' THEN
    RAISE EXCEPTION 'refund request is not in processable state (status: %)', v_req.status;
  END IF;

  v_paid_token_amount := v_req.paid_token_amount;

  SELECT o.status INTO v_order_status
    FROM public.orders o
   WHERE o.id = v_req.order_id
     FOR UPDATE;

  -- 유료 토큰 회수
  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, description, work_id
  ) VALUES (
    v_req.user_id, -v_paid_token_amount, 'refund', 'paid',
    '토큰 환불 승인 (유료)',
    'refund_' || p_request_id::text || '_paid'
  )
  ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;

  IF v_req.bonus_token_amount > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, description, work_id
    ) VALUES (
      v_req.user_id, -v_req.bonus_token_amount, 'refund', 'bonus',
      '토큰 환불 승인 (보너스)',
      'refund_' || p_request_id::text || '_bonus'
    )
    ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
  END IF;

  -- 주문 취소 처리 (전액 환불이므로 항상 취소)
  UPDATE public.orders
     SET status = '취소', updated_at = now()
   WHERE id = v_req.order_id;

  INSERT INTO public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) VALUES (
    v_req.order_id, p_admin_id, v_order_status, '취소',
    '토큰 환불 승인 (request_id: ' || p_request_id::text || ')'
  );

  -- claim_status_logs 기록 (상태 전이 감사 추적)
  INSERT INTO public.claim_status_logs (
    claim_id, changed_by, previous_status, new_status, memo, is_rollback
  ) VALUES (
    p_request_id, p_admin_id, '접수', '완료', '토큰 환불 승인', false
  );

  -- 환불 요청 상태 업데이트
  UPDATE public.claims
     SET status     = '완료',
         updated_at = now()
   WHERE id = p_request_id
     AND type = 'token_refund';
END;
$$;

-- approve_token_refund: service_role 전용
REVOKE EXECUTE ON FUNCTION public.approve_token_refund(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_token_refund(uuid, uuid) TO service_role;
