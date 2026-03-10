-- =============================================================
-- 20260312200000_remove_design_token_expiry.sql
-- design_tokens의 expires_at 컬럼 제거 및 관련 RPC 갱신
-- 토큰 만료 기능을 제거한다. 모든 토큰(grant 포함)은 만료되지 않는다.
-- =============================================================

-- 1. 컬럼 제거
ALTER TABLE public.design_tokens DROP COLUMN expires_at;

-- 2. grant_initial_design_tokens: expires_at 제거
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

  INSERT INTO public.design_tokens (user_id, amount, type, description)
  VALUES (NEW.id, v_amount, 'grant', '신규 가입 토큰 지급');

  RETURN NEW;
END;
$$;

-- 3. get_design_token_balance: expires_at 조건 제거
CREATE OR REPLACE FUNCTION public.get_design_token_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(amount), 0)::integer
  FROM public.design_tokens
  WHERE user_id = auth.uid();
$$;

-- 4. use_design_tokens: expires_at 조건 제거
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
  v_balance     integer;
  v_caller_role text;
BEGIN
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  IF p_ai_model NOT IN ('openai', 'gemini') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;
  IF p_request_type NOT IN ('text_only', 'text_and_image') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;
  IF p_quality NOT IN ('standard', 'high') THEN
    RAISE EXCEPTION 'invalid quality: %', p_quality;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

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

  SELECT COALESCE(SUM(amount), 0)::integer
    INTO v_balance
    FROM public.design_tokens
   WHERE user_id = p_user_id;

  IF v_balance < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'balance', v_balance,
      'cost', v_cost
    );
  END IF;

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

-- 5. manage_design_tokens_admin: p_expires_at 파라미터 및 expires_at 조건 제거
CREATE OR REPLACE FUNCTION public.manage_design_tokens_admin(
  p_user_id    uuid,
  p_amount     integer,
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

  INSERT INTO public.design_tokens (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, 'admin', p_description);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_balance + p_amount
  );
END;
$$;

-- 6. get_design_token_balances_admin: expires_at 조건 제거
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

-- 7. confirm_token_payment: expires_at 컬럼 제거에 맞게 INSERT 갱신
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

  UPDATE public.token_purchases
     SET status = '완료', payment_key = p_payment_key, updated_at = now()
   WHERE id = v_rec.id;

  v_plan_label := CASE v_rec.plan_key
    WHEN 'starter' THEN 'Starter'
    WHEN 'popular' THEN 'Popular'
    WHEN 'pro'     THEN 'Pro'
    ELSE v_rec.plan_key
  END;

  INSERT INTO public.design_tokens (user_id, amount, type, description)
  VALUES (
    v_rec.user_id,
    v_rec.token_amount,
    'purchase',
    '토큰 구매 (' || v_plan_label || ', ' || v_rec.token_amount || '개)'
  );

  RETURN jsonb_build_object(
    'success',      true,
    'token_amount', v_rec.token_amount
  );
END;
$$;
