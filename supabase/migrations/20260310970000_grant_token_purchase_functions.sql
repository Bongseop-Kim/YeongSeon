-- 20260310960000 마이그레이션이 기록은 됐으나 함수가 실제 생성되지 않아 재생성

-- ── get_token_plans ────────────────────────────────────────────
-- SECURITY DEFINER 사유: admin_settings는 RLS로 일반 유저 접근 불가
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

REVOKE ALL ON FUNCTION public.get_token_plans() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_token_plans() TO "anon";
GRANT ALL ON FUNCTION public.get_token_plans() TO "authenticated";

-- ── create_token_purchase ──────────────────────────────────────
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

REVOKE ALL ON FUNCTION public.create_token_purchase(text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_token_purchase(text) TO "anon";
GRANT ALL ON FUNCTION public.create_token_purchase(text) TO "authenticated";
