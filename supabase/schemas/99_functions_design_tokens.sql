-- =============================================================
-- 99_functions_design_tokens.sql  –  Design token RPC functions
-- =============================================================

-- ── get_design_token_balance ──────────────────────────────────
-- Returns the current token balance for the authenticated user.
CREATE OR REPLACE FUNCTION public.get_design_token_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.design_tokens
  WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > now());
$$;

-- ── use_design_tokens ─────────────────────────────────────────
-- Deducts tokens for a design generation request.
-- SECURITY DEFINER 유지 사유: advisory lock + design_tokens INSERT는 RLS로 허용되지 않음
-- service_role(Edge Function)에서 호출 시 소유권 검증 면제
-- Validates ai_model/request_type/quality against a whitelist and fails closed if cost is missing.
-- Returns: { success, cost, balance } or { success: false, error: 'insufficient_tokens', balance, cost }
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
  v_cost_key    text;
  v_cost        integer;
  v_balance     integer;
  v_caller_role text;
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

  -- 현재 잔액 조회 (만료된 토큰 제외)
  SELECT COALESCE(SUM(amount), 0)::integer
    INTO v_balance
    FROM public.design_tokens
   WHERE user_id = p_user_id
     AND (expires_at IS NULL OR expires_at > now());

  -- 잔액 부족 검사
  IF v_balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'balance', v_balance,
      'cost', v_cost
    );
  END IF;

  -- 토큰 차감
  INSERT INTO public.design_tokens (user_id, amount, type, ai_model, request_type, description)
  VALUES (
    p_user_id,
    -v_cost,
    'use',
    p_ai_model,
    p_request_type,
    'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
  );

  RETURN jsonb_build_object(
    'success', true,
    'cost', v_cost,
    'balance', v_balance - v_cost
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
  INSERT INTO public.design_tokens (user_id, amount, type, ai_model, request_type, description, work_id)
  VALUES (
    p_user_id,
    p_amount,
    'refund',
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
  p_expires_at timestamptz DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance integer;
BEGIN
  IF NOT public.is_admin() THEN
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

    SELECT COALESCE(SUM(amount), 0)::integer
      INTO v_balance
      FROM public.design_tokens
     WHERE user_id = p_user_id
       AND (expires_at IS NULL OR expires_at > now());

    IF v_balance < abs(p_amount) THEN
      RAISE EXCEPTION 'insufficient_tokens';
    END IF;
  ELSE
    SELECT COALESCE(SUM(amount), 0)::integer
      INTO v_balance
      FROM public.design_tokens
     WHERE user_id = p_user_id
       AND (expires_at IS NULL OR expires_at > now());
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, description, expires_at)
  VALUES (p_user_id, p_amount, 'admin', p_description, p_expires_at);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_balance + p_amount
  );
END;
$$;

-- ── get_token_plans ───────────────────────────────────────────
-- Returns token plan prices/amounts for store users.
-- SECURITY DEFINER 사유: admin_settings는 RLS로 일반 유저 접근 불가
-- 토큰 플랜 키만 노출하며 다른 admin_settings 키는 반환하지 않음
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
    'token_plan_starter_price',  'token_plan_starter_amount',
    'token_plan_popular_price',  'token_plan_popular_amount',
    'token_plan_pro_price',      'token_plan_pro_amount'
  );

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ── create_token_purchase ─────────────────────────────────────
-- Creates a pending token purchase record for the authenticated user.
-- SECURITY DEFINER 사유: admin_settings RLS가 admin-only이므로 일반 유저 SELECT 불가
-- auth.uid() 소유권 검증으로 무단 접근 차단
CREATE OR REPLACE FUNCTION public.create_token_purchase(
  p_plan_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id        uuid;
  v_price_key      text;
  v_amount_key     text;
  v_price          integer;
  v_token_amount   integer;
  v_payment_group_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  -- 플랜 화이트리스트 검증
  IF p_plan_key NOT IN ('starter', 'popular', 'pro') THEN
    RAISE EXCEPTION 'invalid plan_key: %', p_plan_key;
  END IF;

  -- admin_settings에서 가격/수량 조회
  v_price_key  := 'token_plan_' || p_plan_key || '_price';
  v_amount_key := 'token_plan_' || p_plan_key || '_amount';

  SELECT value::integer INTO v_price
    FROM public.admin_settings WHERE key = v_price_key;
  SELECT value::integer INTO v_token_amount
    FROM public.admin_settings WHERE key = v_amount_key;

  IF v_price IS NULL OR v_price <= 0 THEN
    RAISE EXCEPTION 'price not configured for plan: %', p_plan_key;
  END IF;
  IF v_token_amount IS NULL OR v_token_amount <= 0 THEN
    RAISE EXCEPTION 'token_amount not configured for plan: %', p_plan_key;
  END IF;

  v_payment_group_id := gen_random_uuid();

  INSERT INTO public.token_purchases (
    user_id, payment_group_id, plan_key, token_amount, price, status
  ) VALUES (
    v_user_id, v_payment_group_id, p_plan_key, v_token_amount, v_price, '대기중'
  );

  RETURN jsonb_build_object(
    'payment_group_id', v_payment_group_id,
    'price',            v_price,
    'token_amount',     v_token_amount
  );
END;
$$;

-- ── lock_token_payment ────────────────────────────────────────
-- Transitions token_purchases status: 대기중 → 결제중.
-- SECURITY DEFINER 사유: service_role 전용, RLS 우회 필요
CREATE OR REPLACE FUNCTION public.lock_token_payment(
  p_payment_group_id uuid,
  p_user_id          uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
  v_rec         record;
BEGIN
  -- service_role 전용
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: lock_token_payment requires service_role';
  END IF;

  SELECT id, user_id, status
    INTO v_rec
    FROM public.token_purchases
   WHERE payment_group_id = p_payment_group_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token_purchase not found';
  END IF;

  IF v_rec.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: user does not own this token purchase';
  END IF;

  -- 이미 완료된 경우 멱등성 처리
  IF v_rec.status = '완료' THEN
    RETURN jsonb_build_object('already_confirmed', true);
  END IF;

  IF v_rec.status NOT IN ('대기중', '결제중') THEN
    RAISE EXCEPTION 'token purchase is not payable: %', v_rec.status;
  END IF;

  UPDATE public.token_purchases
     SET status = '결제중', updated_at = now()
   WHERE id = v_rec.id;

  RETURN jsonb_build_object('already_confirmed', false);
END;
$$;

-- ── confirm_token_payment ─────────────────────────────────────
-- Transitions token_purchases: 결제중 → 완료 and grants tokens.
-- SECURITY DEFINER 사유: service_role 전용, design_tokens INSERT는 RLS로 허용되지 않음
CREATE OR REPLACE FUNCTION public.confirm_token_payment(
  p_payment_group_id uuid,
  p_user_id          uuid,
  p_payment_key      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
  v_rec         record;
  v_plan_label  text;
BEGIN
  -- service_role 전용
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: confirm_token_payment requires service_role';
  END IF;

  SELECT id, user_id, status, plan_key, token_amount, payment_key
    INTO v_rec
    FROM public.token_purchases
   WHERE payment_group_id = p_payment_group_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token_purchase not found';
  END IF;

  IF v_rec.user_id <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: user does not own this token purchase';
  END IF;

  -- 멱등성: 이미 완료된 경우 동일 payment_key면 성공 반환, 다르면 충돌 에러
  IF v_rec.status = '완료' THEN
    IF v_rec.payment_key = p_payment_key THEN
      RETURN jsonb_build_object('success', true, 'token_amount', v_rec.token_amount);
    ELSE
      RAISE EXCEPTION 'conflict: already confirmed with different payment_key';
    END IF;
  END IF;

  IF v_rec.status <> '결제중' THEN
    RAISE EXCEPTION 'token purchase is not in 결제중 state: %', v_rec.status;
  END IF;

  -- 완료 처리
  UPDATE public.token_purchases
     SET status = '완료', payment_key = p_payment_key, updated_at = now()
   WHERE id = v_rec.id;

  -- 플랜 이름 한글화
  v_plan_label := CASE v_rec.plan_key
    WHEN 'starter' THEN 'Starter'
    WHEN 'popular' THEN 'Popular'
    WHEN 'pro'     THEN 'Pro'
    ELSE v_rec.plan_key
  END;

  -- 토큰 지급 (expires_at = NULL: 구매 토큰은 만료 없음)
  INSERT INTO public.design_tokens (user_id, amount, type, description, expires_at)
  VALUES (
    v_rec.user_id,
    v_rec.token_amount,
    'purchase',
    '토큰 구매 (' || v_plan_label || ', ' || v_rec.token_amount || '개)',
    NULL
  );

  RETURN jsonb_build_object(
    'success',      true,
    'token_amount', v_rec.token_amount
  );
END;
$$;

-- ── unlock_token_payment ──────────────────────────────────────
-- Reverts token_purchases status: 결제중 → 대기중 (Toss 실패 시 복원).
-- SECURITY DEFINER 사유: service_role 전용, RLS 우회 필요
CREATE OR REPLACE FUNCTION public.unlock_token_payment(
  p_payment_group_id uuid,
  p_user_id          uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role text;
  v_rec         record;
BEGIN
  -- service_role 전용
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: unlock_token_payment requires service_role';
  END IF;

  SELECT id, user_id, status
    INTO v_rec
    FROM public.token_purchases
   WHERE payment_group_id = p_payment_group_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_rec.user_id <> p_user_id THEN
    RETURN;
  END IF;

  IF v_rec.status = '결제중' THEN
    UPDATE public.token_purchases
       SET status = '대기중', updated_at = now()
     WHERE id = v_rec.id;
  END IF;
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
    WHERE dt.expires_at IS NULL OR dt.expires_at > now()
    GROUP BY dt.user_id
  )
  SELECT ru.user_id, COALESCE(b.balance, 0)::integer AS balance
  FROM requested_users AS ru
  LEFT JOIN balances AS b
    ON b.user_id = ru.user_id;
END;
$$;
