-- =============================================================
-- token_purchases 테이블, design_tokens.type 확장, RPC 4개 추가
-- =============================================================

-- ── 1. token_purchases 테이블 ─────────────────────────────────
CREATE TABLE public.token_purchases (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_group_id  uuid        NOT NULL UNIQUE,
  plan_key          text        NOT NULL CHECK (plan_key IN ('starter','popular','pro')),
  token_amount      integer     NOT NULL CHECK (token_amount > 0),
  price             integer     NOT NULL CHECK (price > 0),
  status            text        NOT NULL DEFAULT '대기중'
                    CHECK (status IN ('대기중','결제중','완료','실패')),
  payment_key       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_purchases_user_id ON public.token_purchases (user_id, created_at DESC);

ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token purchases"
  ON public.token_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── 2. design_tokens.type CHECK에 'purchase' 추가 ─────────────
ALTER TABLE public.design_tokens
  DROP CONSTRAINT design_tokens_type_check;

ALTER TABLE public.design_tokens
  ADD CONSTRAINT design_tokens_type_check
  CHECK (type = ANY(ARRAY['grant','use','refund','admin','purchase']));

-- ── 3. admin_settings 시드 데이터 ────────────────────────────
INSERT INTO public.admin_settings (key, value) VALUES
  ('token_plan_starter_price',   '2900'),
  ('token_plan_starter_amount',  '30'),
  ('token_plan_popular_price',   '7900'),
  ('token_plan_popular_amount',  '120'),
  ('token_plan_pro_price',       '14900'),
  ('token_plan_pro_amount',      '300')
ON CONFLICT (key) DO NOTHING;

-- ── 4. create_token_purchase RPC ─────────────────────────────
-- SECURITY INVOKER: auth.uid() 소유권 검증으로 충분
CREATE OR REPLACE FUNCTION public.create_token_purchase(
  p_plan_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id          uuid;
  v_price_key        text;
  v_amount_key       text;
  v_price            integer;
  v_token_amount     integer;
  v_payment_group_id uuid;
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

-- ── 5. lock_token_payment RPC ─────────────────────────────────
-- SECURITY DEFINER 사유: service_role 전용, token_purchases UPDATE는 RLS로 허용되지 않음
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

-- ── 6. confirm_token_payment RPC ──────────────────────────────
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
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'unauthorized: confirm_token_payment requires service_role';
  END IF;

  SELECT id, user_id, status, plan_key, token_amount
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

  -- 구매 토큰은 만료 없음 (expires_at = NULL)
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

-- ── 7. unlock_token_payment RPC ───────────────────────────────
-- SECURITY DEFINER 사유: service_role 전용, Toss 실패 시 결제중 → 대기중 복원
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

-- ── 8. get_token_plans RPC ────────────────────────────────────
-- SECURITY DEFINER 사유: admin_settings는 RLS로 일반 유저 접근 불가
-- 토큰 플랜 가격/수량만 노출하며 다른 admin_settings 키는 반환하지 않음
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
