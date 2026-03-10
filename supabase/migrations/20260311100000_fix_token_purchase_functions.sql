-- =============================================================
-- token_purchases 관련 버그 수정
-- 1. updated_at 트리거 연결 (#13)
-- 2. create_token_purchase SECURITY DEFINER로 변경 (#6)
-- 3. confirm_token_payment 멱등성 추가 (#5)
-- 4. create_token_purchase anon GRANT 제거 (#14)
-- =============================================================

-- ── 1. token_purchases updated_at 트리거 ─────────────────────
CREATE OR REPLACE TRIGGER update_token_purchases_updated_at
  BEFORE UPDATE ON public.token_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2. create_token_purchase SECURITY DEFINER로 재생성 ───────
-- SECURITY DEFINER 사유: admin_settings RLS가 admin-only이므로
-- 일반 유저가 SECURITY INVOKER 컨텍스트에서 SELECT 불가.
-- auth.uid() 소유권 검증으로 무단 접근 차단.
CREATE OR REPLACE FUNCTION public.create_token_purchase(
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

-- ── 3. confirm_token_payment 멱등성 추가 ─────────────────────
-- 동일 payment_key로 재호출 시 성공을 반환하여 중복 확인 안전하게 처리
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

-- ── 4. create_token_purchase anon GRANT 제거 ─────────────────
-- create_token_purchase는 auth.uid() 필수이므로 anon 호출 불필요
REVOKE ALL ON FUNCTION public.create_token_purchase(text) FROM "anon";
GRANT EXECUTE ON FUNCTION public.create_token_purchase(text) TO "authenticated";
