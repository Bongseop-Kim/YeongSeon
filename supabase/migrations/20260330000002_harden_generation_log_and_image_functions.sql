-- Follow-up hardening for generation log/admin image flows.
-- Existing pushed migration state could not be verified because `supabase migration list`
-- failed with:
--   Initialising login role...
--   Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.
-- Per repository rule, we treat prior migrations as already applied and ship fixes via a new migration.

-- SECURITY DEFINER rationale for use_design_tokens:
-- 1. design_tokens INSERT remains RPC-only and is not granted directly through RLS policies,
--    so the function must execute with the function owner's rights to write the ledger rows.
-- 2. Ownership is still enforced inside the function via auth.uid() = p_user_id unless the
--    caller is service_role, which is the intended Edge Function path.
-- 3. The effective privilege surface is limited to the function owner and every deduction /
--    refund stays audit-able in the design_tokens ledger.
-- 4. SET search_path TO 'public' is required in SECURITY DEFINER context to avoid search_path
--    spoofing and ensure object resolution stays pinned to trusted schemas.
CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id      uuid,
  p_ai_model     text,
  p_request_type text,
  p_quality      text DEFAULT 'standard',
  p_work_id      text DEFAULT NULL
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
  v_paid_deduct  integer;
  v_bonus_deduct integer;
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

  IF EXISTS (
    SELECT 1
    FROM public.claims
    WHERE user_id = p_user_id
      AND type = 'token_refund'
      AND status = '접수'
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

  SELECT
    COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer,
    COALESCE(SUM(amount) FILTER (WHERE token_class IN ('bonus', 'free')), 0)::integer
  INTO v_paid_bal, v_bonus_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id;

  v_total_bal := v_paid_bal + v_bonus_bal;

  IF p_work_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.design_tokens
    WHERE user_id = p_user_id
      AND work_id IN (p_work_id || '_use_paid', p_work_id || '_use_bonus')
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'cost', 0,
      'balance', v_total_bal
    );
  END IF;

  IF v_total_bal < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'balance', v_total_bal,
      'cost', v_cost
    );
  END IF;

  v_paid_deduct := LEAST(v_cost, v_paid_bal);
  v_bonus_deduct := v_cost - v_paid_deduct;

  IF v_paid_deduct > 0 THEN
    INSERT INTO public.design_tokens (
      user_id, amount, type, token_class, ai_model, request_type, description, work_id
    ) VALUES (
      p_user_id, -v_paid_deduct, 'use', 'paid',
      p_ai_model, p_request_type,
      'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ') - 유료',
      CASE WHEN p_work_id IS NOT NULL THEN p_work_id || '_use_paid' ELSE NULL END
    )
    ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
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

  RETURN jsonb_build_object(
    'success', true,
    'cost', v_cost,
    'balance', v_total_bal - v_cost
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.register_image(
  p_url         text,
  p_file_id     text,
  p_folder      text,
  p_entity_type text,
  p_entity_id   text,
  p_expires_at  timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_entity_type = 'product' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'quote_request' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.quote_requests qr
      WHERE qr.id::text = p_entity_id
        AND qr.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'custom_order' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = p_entity_id
        AND o.user_id = v_user_id
        AND o.order_type = 'custom'
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'reform' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id::text = p_entity_id
        AND o.user_id = v_user_id
        AND o.order_type = 'repair'
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSIF p_entity_type = 'design_message' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.design_chat_messages m
      JOIN public.design_chat_sessions s ON s.id = m.session_id
      WHERE m.id::text = p_entity_id
        AND s.user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'You do not own %:%', p_entity_type, p_entity_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END IF;

  INSERT INTO public.images (url, file_id, folder, entity_type, entity_id, uploaded_by, expires_at)
  VALUES (p_url, p_file_id, p_folder, p_entity_type, p_entity_id, v_user_id, p_expires_at)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_generation_logs(
  p_start_date date,
  p_end_date   date,
  p_ai_model   text    DEFAULT NULL,
  p_limit      integer DEFAULT 50,
  p_offset     integer DEFAULT 0
)
RETURNS TABLE (
  id                  uuid,
  work_id             text,
  user_id             uuid,
  ai_model            text,
  request_type        text,
  quality             text,
  user_message        text,
  prompt_length       integer,
  design_context      jsonb,
  conversation_turn   integer,
  has_ci_image        boolean,
  has_reference_image boolean,
  has_previous_image  boolean,
  ai_message          text,
  generate_image      boolean,
  image_generated     boolean,
  detected_design     jsonb,
  tokens_charged      integer,
  tokens_refunded     integer,
  text_latency_ms     integer,
  image_latency_ms    integer,
  total_latency_ms    integer,
  error_type          text,
  created_at          timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'p_start_date and p_end_date are required';
  END IF;

  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'p_start_date must be <= p_end_date';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 200';
  END IF;

  IF p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION 'p_offset must be >= 0';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.work_id,
    l.user_id,
    l.ai_model,
    l.request_type,
    l.quality,
    l.user_message,
    l.prompt_length,
    l.design_context,
    l.conversation_turn,
    l.has_ci_image,
    l.has_reference_image,
    l.has_previous_image,
    l.ai_message,
    l.generate_image,
    l.image_generated,
    l.detected_design,
    l.tokens_charged,
    l.tokens_refunded,
    l.text_latency_ms,
    l.image_latency_ms,
    l.total_latency_ms,
    l.error_type,
    l.created_at
  FROM public.ai_generation_logs l
  WHERE l.created_at >= p_start_date
    AND l.created_at < p_end_date + 1
    AND (p_ai_model IS NULL OR l.ai_model = p_ai_model)
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
