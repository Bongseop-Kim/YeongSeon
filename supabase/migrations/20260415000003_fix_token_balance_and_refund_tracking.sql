-- =============================================================
-- Fix token admin balance expiry filter and legacy refund tracing
-- =============================================================

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
          AND (
            dt.source_order_id = o.id
            OR dt.work_id = 'order_' || o.id::text
          )
      ), 0)::integer                                    AS paid_tokens_granted,
      COALESCE((
        SELECT MAX(dt.created_at)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (
            dt.source_order_id = o.id
            OR dt.work_id = 'order_' || o.id::text
          )
      ), o.created_at)                                  AS token_granted_at,
      (
        SELECT MAX(dt.expires_at)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'paid'
          AND (
            dt.source_order_id = o.id
            OR dt.work_id = 'order_' || o.id::text
          )
      )                                                 AS token_expires_at,
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
      'token_expires_at',      cto.token_expires_at,
      'is_refundable',         CASE
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
  v_caller_role         text;
  v_req                 record;
  v_paid_token_amount   integer;
  v_order_status        text;
  v_source_order_id     uuid;
  v_purchase_expires_at timestamptz;
BEGIN
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

  SELECT dt.source_order_id, dt.expires_at
    INTO v_source_order_id, v_purchase_expires_at
    FROM public.design_tokens dt
   WHERE dt.user_id = v_req.user_id
     AND dt.type = 'purchase'
     AND (
       dt.source_order_id = v_req.order_id
       OR dt.work_id = 'order_' || v_req.order_id::text
     )
   ORDER BY dt.created_at DESC
   LIMIT 1;

  v_source_order_id := COALESCE(v_source_order_id, v_req.order_id);

  IF v_req.status = '완료' THEN
    RETURN;
  END IF;

  IF v_req.status != '접수' THEN
    RAISE EXCEPTION 'refund request is not in processable state (status: %)', v_req.status;
  END IF;

  v_paid_token_amount := v_req.paid_token_amount;

  SELECT o.status INTO v_order_status
    FROM public.orders o
   WHERE o.id = v_req.order_id
     FOR UPDATE;

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class,
    source_order_id, expires_at,
    description, work_id
  ) VALUES (
    v_req.user_id, -v_paid_token_amount, 'refund', 'paid',
    v_source_order_id, v_purchase_expires_at,
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

  UPDATE public.orders
     SET status = '취소', updated_at = now()
   WHERE id = v_req.order_id;

  INSERT INTO public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) VALUES (
    v_req.order_id, p_admin_id, v_order_status, '취소',
    '토큰 환불 승인 (request_id: ' || p_request_id::text || ')'
  );

  INSERT INTO public.claim_status_logs (
    claim_id, changed_by, previous_status, new_status, memo, is_rollback
  ) VALUES (
    p_request_id, p_admin_id, '접수', '완료', '토큰 환불 승인', false
  );

  UPDATE public.claims
     SET status     = '완료',
         updated_at = now()
   WHERE id = p_request_id
     AND type = 'token_refund';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_token_refund(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_token_refund(uuid, uuid) TO service_role;
