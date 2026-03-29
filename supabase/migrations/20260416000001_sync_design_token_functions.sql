-- =============================================================
-- Sync design token RPCs with current schema definitions
-- - preserve original cost on use_design_tokens idempotent retry
-- - restore legacy _paid matching in get_refundable_token_orders
-- - add storefront token plan/order RPCs
-- - emit machine-readable token expiry errors for request_token_refund
-- =============================================================

CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id uuid,
  p_ai_model text,
  p_request_type text,
  p_quality text DEFAULT 'standard',
  p_work_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cost_key text;
  v_cost integer;
  v_total_bal integer;
  v_paid_bal integer;
  v_bonus_bal integer;
  v_caller_role text;
  v_paid_deduct integer;
  v_bonus_deduct integer;
  v_remaining_paid integer;
  v_batch_consume integer;
  v_batch_idx integer;
  v_batch_row record;
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
      CASE p_request_type WHEN 'text_and_image' THEN 'image' ELSE 'text' END
  END;

  SELECT value::integer INTO v_cost FROM public.admin_settings WHERE key = v_cost_key;
  IF v_cost IS NULL OR v_cost <= 0 THEN
    RAISE EXCEPTION 'cost not configured for key: %', v_cost_key;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.claims
    WHERE user_id = p_user_id
      AND type = 'token_refund' AND status = '접수'
  ) THEN
    SELECT COALESCE(SUM(amount) FILTER (WHERE expires_at IS NULL OR expires_at > now()), 0)::integer
      INTO v_total_bal FROM public.design_tokens WHERE user_id = p_user_id;
    RETURN jsonb_build_object(
      'success', false, 'error', 'refund_pending', 'balance', v_total_bal, 'cost', v_cost
    );
  END IF;

  SELECT COALESCE(SUM(amount), 0)::integer INTO v_paid_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id
    AND token_class = 'paid'
    AND (expires_at IS NULL OR expires_at > now());

  SELECT COALESCE(SUM(amount), 0)::integer INTO v_bonus_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id AND token_class IN ('bonus', 'free');
  v_total_bal := v_paid_bal + v_bonus_bal;

  IF p_work_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.design_tokens
    WHERE user_id = p_user_id
      AND work_id IN (
        p_work_id || '_use_paid',
        p_work_id || '_use_paid_0',
        p_work_id || '_use_paid_legacy',
        p_work_id || '_use_bonus'
      )
  ) THEN
    RETURN jsonb_build_object('success', true, 'cost', v_cost, 'balance', v_total_bal);
  END IF;

  IF v_total_bal < v_cost THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'insufficient_tokens', 'balance', v_total_bal, 'cost', v_cost
    );
  END IF;

  v_paid_deduct := LEAST(v_cost, v_paid_bal);
  v_bonus_deduct := v_cost - v_paid_deduct;

  IF v_paid_deduct > 0 THEN
    v_remaining_paid := v_paid_deduct;
    v_batch_idx := 0;

    FOR v_batch_row IN
      SELECT source_order_id, expires_at, SUM(amount)::integer AS remaining
      FROM public.design_tokens
      WHERE user_id = p_user_id
        AND token_class = 'paid'
        AND source_order_id IS NOT NULL
        AND expires_at > now()
      GROUP BY source_order_id, expires_at
      HAVING SUM(amount) > 0
      ORDER BY expires_at ASC
    LOOP
      EXIT WHEN v_remaining_paid <= 0;

      v_batch_consume := LEAST(v_remaining_paid, v_batch_row.remaining);

      INSERT INTO public.design_tokens (
        user_id, amount, type, token_class,
        source_order_id, expires_at,
        ai_model, request_type, description, work_id
      ) VALUES (
        p_user_id, -v_batch_consume, 'use', 'paid',
        v_batch_row.source_order_id, v_batch_row.expires_at,
        p_ai_model, p_request_type,
        'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 유료',
        CASE WHEN p_work_id IS NOT NULL
          THEN p_work_id || '_use_paid_' || v_batch_idx
          ELSE NULL END
      )
      ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;

      v_remaining_paid := v_remaining_paid - v_batch_consume;
      v_batch_idx := v_batch_idx + 1;
    END LOOP;

    IF v_remaining_paid > 0 THEN
      INSERT INTO public.design_tokens (
        user_id, amount, type, token_class,
        source_order_id, expires_at,
        ai_model, request_type, description, work_id
      ) VALUES (
        p_user_id, -v_remaining_paid, 'use', 'paid',
        NULL, NULL,
        p_ai_model, p_request_type,
        'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 유료 (레거시)',
        CASE WHEN p_work_id IS NOT NULL
          THEN p_work_id || '_use_paid_legacy'
          ELSE NULL END
      )
      ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
    END IF;
  END IF;

  IF v_bonus_deduct > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description, work_id
    ) VALUES (
      p_user_id, -v_bonus_deduct, 'use', 'bonus',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 보너스',
      CASE WHEN p_work_id IS NOT NULL THEN p_work_id || '_use_bonus' ELSE NULL END
    )
    ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'cost', v_cost, 'balance', v_total_bal - v_cost);
END;
$$;

-- ── manage_design_tokens_admin ───────────────────────────────
-- Admin-only grant/deduction for design tokens with audit trail.
-- Related storefront RPCs: get_token_plans(), create_token_order()
CREATE OR REPLACE FUNCTION public.manage_design_tokens_admin(
  p_user_id uuid,
  p_amount integer,
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

  IF p_amount < 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
  END IF;

  SELECT COALESCE(SUM(amount) FILTER (WHERE expires_at IS NULL OR expires_at > now()), 0)::integer
    INTO v_balance
    FROM public.design_tokens
   WHERE user_id = p_user_id;

  IF p_amount < 0 THEN
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
CREATE OR REPLACE FUNCTION public.create_token_order(
  p_plan_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_price_key text;
  v_amount_key text;
  v_price integer;
  v_token_amount integer;
  v_payment_group_id uuid;
  v_order_number text;
  v_order_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  IF p_plan_key NOT IN ('starter', 'popular', 'pro') THEN
    RAISE EXCEPTION 'invalid plan_key: %', p_plan_key;
  END IF;

  v_price_key := 'token_plan_' || p_plan_key || '_price';
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
  v_order_number := public.generate_token_order_number();
  v_order_id := gen_random_uuid();

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
      'plan_key', p_plan_key,
      'token_amount', v_token_amount
    ),
    1, v_price
  );

  RETURN jsonb_build_object(
    'payment_group_id', v_payment_group_id,
    'price', v_price,
    'token_amount', v_token_amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_refundable_token_orders()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  WITH completed_token_orders AS (
    SELECT
      o.id AS order_id,
      o.order_number,
      o.created_at,
      o.total_price,
      COALESCE((
        SELECT SUM(dt.amount)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (
            dt.source_order_id = o.id
            OR dt.work_id = 'order_' || o.id::text
            OR dt.work_id = 'order_' || o.id::text || '_paid'
          )
      ), 0)::integer AS paid_tokens_granted,
      COALESCE((
        SELECT MAX(dt.created_at)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (
            dt.source_order_id = o.id
            OR dt.work_id = 'order_' || o.id::text
            OR dt.work_id = 'order_' || o.id::text || '_paid'
          )
      ), o.created_at) AS token_granted_at,
      (
        SELECT MAX(dt.expires_at)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (
            dt.source_order_id = o.id
            OR dt.work_id = 'order_' || o.id::text
            OR dt.work_id = 'order_' || o.id::text || '_paid'
          )
      ) AS token_expires_at,
      (
        SELECT jsonb_build_object('id', c.id, 'status', c.status)
        FROM public.claims c
        WHERE c.order_id = o.id
          AND c.type = 'token_refund'
          AND c.status IN ('접수', '완료')
        LIMIT 1
      ) AS active_refund_request
    FROM public.orders o
    WHERE o.user_id = v_user_id
      AND o.order_type = 'token'
      AND o.status = '완료'
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_id', cto.order_id,
      'order_number', cto.order_number,
      'created_at', cto.created_at,
      'total_price', cto.total_price,
      'paid_tokens_granted', cto.paid_tokens_granted,
      'bonus_tokens_granted', 0,
      'token_expires_at', cto.token_expires_at,
      'is_refundable', CASE
        WHEN cto.token_expires_at IS NOT NULL
          AND cto.token_expires_at <= now() THEN false
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
        WHEN cto.token_expires_at IS NOT NULL
          AND cto.token_expires_at <= now() THEN 'expired'
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
      'pending_request_id', CASE
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
CREATE OR REPLACE FUNCTION public.request_token_refund(
  p_order_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_order record;
  v_latest_order_id uuid;
  v_paid_granted integer;
  v_token_granted_at timestamptz;
  v_token_expires_at timestamptz;
  v_refund_amount integer;
  v_token_item_id uuid;
  v_claim_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

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

  SELECT
    COALESCE(SUM(dt.amount), 0)::integer,
    MAX(dt.created_at),
    MAX(dt.expires_at)
  INTO v_paid_granted, v_token_granted_at, v_token_expires_at
  FROM public.design_tokens dt
  WHERE dt.user_id = v_user_id
    AND dt.type = 'purchase'
    AND dt.token_class = 'paid'
    AND (
      dt.source_order_id = p_order_id
      OR dt.work_id = 'order_' || p_order_id::text || '_paid'
      OR dt.work_id = 'order_' || p_order_id::text
    );

  IF v_paid_granted <= 0 THEN
    RAISE EXCEPTION 'no paid tokens found for this order';
  END IF;

  v_token_granted_at := COALESCE(v_token_granted_at, v_order.created_at);

  IF v_token_expires_at IS NOT NULL AND v_token_expires_at <= now() THEN
    RAISE EXCEPTION USING
      MESSAGE = 'token_order_expired',
      DETAIL = jsonb_build_object(
        'code', 'token_order_expired',
        'message', 'refund period has passed'
      )::text;
  END IF;

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
      'refund_amount', v_refund_amount
    )
  )
  RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object(
    'request_id', v_claim_id,
    'refund_amount', v_refund_amount,
    'paid_token_amount', v_paid_granted,
    'bonus_token_amount', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_token_plans() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_token_plans() TO anon;
GRANT ALL ON FUNCTION public.get_token_plans() TO authenticated;
GRANT ALL ON FUNCTION public.get_token_plans() TO service_role;

GRANT ALL ON FUNCTION public.create_token_order(text) TO anon;
GRANT ALL ON FUNCTION public.create_token_order(text) TO authenticated;
GRANT ALL ON FUNCTION public.create_token_order(text) TO service_role;
