-- =============================================================
-- 20260417000000_design_analysis_render_split.sql
-- Design analysis/render split + admin-only generation logs
-- =============================================================

DO $$
DECLARE
  v_has_new_schema boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ai_generation_logs'
      AND column_name = 'workflow_id'
  )
  INTO v_has_new_schema;

  IF v_has_new_schema THEN
    RETURN;
  END IF;

  IF to_regclass('public.ai_generation_logs') IS NOT NULL
     AND to_regclass('public.ai_generation_logs_legacy') IS NULL THEN
    EXECUTE 'ALTER TABLE public.ai_generation_logs RENAME TO ai_generation_logs_legacy';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          text        NOT NULL,
  phase                text        NOT NULL CHECK (phase IN ('analysis', 'render')),
  work_id              text        NOT NULL UNIQUE,
  parent_work_id       text,
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_model             text        NOT NULL CHECK (ai_model IN ('openai', 'gemini')),
  request_type         text        NOT NULL CHECK (request_type IN ('analysis', 'render_standard', 'render_high')),
  quality              text        CHECK (quality IN ('standard', 'high')),
  user_message         text        NOT NULL,
  conversation_turn    integer     NOT NULL DEFAULT 0,
  prompt_length        integer,
  design_context       jsonb,
  normalized_design    jsonb,
  has_ci_image         boolean,
  has_reference_image  boolean,
  has_previous_image   boolean,
  generate_image       boolean,
  eligible_for_render  boolean,
  missing_requirements  jsonb,
  eligibility_reason    text,
  detected_design      jsonb,
  text_prompt          text,
  image_prompt         text,
  image_edit_prompt    text,
  ai_message           text,
  image_generated      boolean     NOT NULL DEFAULT false,
  generated_image_url  text,
  tokens_charged       integer     NOT NULL DEFAULT 0,
  tokens_refunded      integer     NOT NULL DEFAULT 0,
  text_latency_ms      integer,
  image_latency_ms     integer,
  total_latency_ms     integer,
  error_type           text,
  error_message        text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_gen_logs_workflow       ON public.ai_generation_logs (workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gen_logs_parent_work_id ON public.ai_generation_logs (parent_work_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gen_logs_user           ON public.ai_generation_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gen_logs_model          ON public.ai_generation_logs (ai_model, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gen_logs_created        ON public.ai_generation_logs (created_at DESC);

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_generation_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_generation_logs TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.ai_generation_logs TO service_role;

DROP POLICY IF EXISTS "Admins can view all generation logs" ON public.ai_generation_logs;

CREATE POLICY "Admins can view all generation logs"
  ON public.ai_generation_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

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
  v_cost_key       text;
  v_cost           integer;
  v_total_bal      integer;
  v_paid_bal       integer;
  v_bonus_bal      integer;
  v_caller_role    text;
  v_paid_deduct    integer;
  v_bonus_deduct   integer;
  v_remaining_paid integer;
  v_batch_consume  integer;
  v_batch_idx      integer;
  v_batch_row      RECORD;
BEGIN
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  IF p_ai_model NOT IN ('openai', 'gemini') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;
  IF p_request_type NOT IN ('analysis', 'render_standard', 'render_high') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;
  IF p_quality NOT IN ('standard', 'high') THEN
    RAISE EXCEPTION 'invalid quality: %', p_quality;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_cost_key := CASE
    WHEN p_request_type = 'analysis' THEN
      'design_token_cost_' || p_ai_model || '_analysis'
    WHEN p_request_type = 'render_standard' THEN
      'design_token_cost_' || p_ai_model || '_render_standard'
    WHEN p_request_type = 'render_high' THEN
      'design_token_cost_' || p_ai_model || '_render_high'
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

  v_paid_deduct  := LEAST(v_cost, v_paid_bal);
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

  IF p_ai_model NOT IN ('openai', 'gemini') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;

  IF p_request_type NOT IN ('analysis', 'render_standard', 'render_high') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;

  IF p_amount <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, token_class, ai_model, request_type, description, work_id)
  VALUES (
    p_user_id,
    p_amount,
    'refund',
    'paid',
    p_ai_model,
    p_request_type,
    '이미지 생성 실패 환불 (' || p_ai_model || ')',
    p_work_id
  )
  ON CONFLICT (work_id) WHERE work_id IS NOT NULL DO NOTHING;
END;
$$;
