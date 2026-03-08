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
  WHERE user_id = auth.uid();
$$;

-- ── use_design_tokens ─────────────────────────────────────────
-- Deducts tokens for a design generation request.
-- SECURITY DEFINER: service_role 전용 (Edge Function에서 호출)
-- Returns: { success, cost, balance } or { success: false, error: 'insufficient_tokens', balance, cost }
CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id     uuid,
  p_ai_model    text,   -- 'openai' | 'gemini'
  p_request_type text   -- 'text_only' | 'text_and_image'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cost_key   text;
  v_cost       integer;
  v_balance    integer;
BEGIN
  -- 동시 요청에 대한 advisory lock (사용자별)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- admin_settings에서 비용 조회
  v_cost_key := 'design_token_cost_' || p_ai_model || '_' ||
    CASE p_request_type
      WHEN 'text_and_image' THEN 'image'
      ELSE 'text'
    END;

  SELECT COALESCE(value::integer, 1)
    INTO v_cost
    FROM public.admin_settings
   WHERE key = v_cost_key;

  IF v_cost IS NULL THEN
    v_cost := 1;
  END IF;

  -- 현재 잔액 조회
  SELECT COALESCE(SUM(amount), 0)::integer
    INTO v_balance
    FROM public.design_tokens
   WHERE user_id = p_user_id;

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
-- SECURITY DEFINER: service_role 전용 (Edge Function에서 호출)
CREATE OR REPLACE FUNCTION public.refund_design_tokens(
  p_user_id     uuid,
  p_amount      integer,
  p_ai_model    text,
  p_request_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_amount <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.design_tokens (user_id, amount, type, ai_model, request_type, description)
  VALUES (
    p_user_id,
    p_amount,
    'refund',
    p_ai_model,
    p_request_type,
    '이미지 생성 실패 환불 (' || p_ai_model || ')'
  );
END;
$$;
