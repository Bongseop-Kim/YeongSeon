-- =============================================================
-- 20260318100000_improve_token_order_refund_status.sql
-- get_refundable_token_orders 개선:
-- 환불 불가 주문도 포함하여 이유와 함께 반환
-- =============================================================

DROP FUNCTION public.get_refundable_token_orders();

CREATE OR REPLACE FUNCTION public.get_refundable_token_orders()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id  uuid;
  v_paid_bal integer;
  v_result   jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  -- 현재 유료 토큰 잔액
  SELECT COALESCE(SUM(amount) FILTER (WHERE token_class = 'paid'), 0)::integer
    INTO v_paid_bal
    FROM public.design_tokens
   WHERE user_id = v_user_id;

  WITH all_token_orders AS (
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
          AND (dt.work_id = 'order_' || o.id::text || '_paid'
               OR dt.work_id = 'order_' || o.id::text)
      ), 0)::integer                                    AS paid_tokens_granted,
      COALESCE((
        SELECT SUM(dt.amount)
        FROM public.design_tokens dt
        WHERE dt.user_id = v_user_id
          AND dt.type = 'purchase'
          AND dt.token_class = 'bonus'
          AND dt.work_id = 'order_' || o.id::text || '_bonus'
      ), 0)::integer                                    AS bonus_tokens_granted,
      -- 진행 중인 환불 요청 정보 (pending/approved)
      (
        SELECT jsonb_build_object('id', trr.id, 'status', trr.status)
        FROM public.token_refund_requests trr
        WHERE trr.order_id = o.id
          AND trr.status IN ('pending', 'approved')
        LIMIT 1
      )                                                 AS active_refund_request
    FROM public.orders o
    WHERE o.user_id = v_user_id
      AND o.order_type = 'token'
      AND o.status = '완료'
  ),
  running AS (
    SELECT
      *,
      SUM(paid_tokens_granted) OVER (
        ORDER BY created_at DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS cumulative_paid
    FROM all_token_orders
    WHERE active_refund_request IS NULL  -- LIFO 계산에서는 진행 중 환불 주문 제외
  ),
  refundability AS (
    -- 환불 불가 사유가 있는 주문 (진행 중 환불)
    SELECT
      ato.order_id,
      ato.order_number,
      ato.created_at,
      ato.total_price,
      ato.paid_tokens_granted,
      ato.bonus_tokens_granted,
      false                                             AS is_refundable,
      CASE (ato.active_refund_request->>'status')
        WHEN 'pending'  THEN 'pending_refund'
        WHEN 'approved' THEN 'approved_refund'
        ELSE 'active_refund'
      END                                               AS not_refundable_reason,
      (ato.active_refund_request->>'id')::uuid          AS pending_request_id
    FROM all_token_orders ato
    WHERE ato.active_refund_request IS NOT NULL

    UNION ALL

    -- LIFO 계산 대상 주문 (진행 중 환불 없음)
    SELECT
      r.order_id,
      r.order_number,
      r.created_at,
      r.total_price,
      r.paid_tokens_granted,
      r.bonus_tokens_granted,
      (r.cumulative_paid <= v_paid_bal AND r.paid_tokens_granted > 0) AS is_refundable,
      CASE
        WHEN r.paid_tokens_granted = 0 THEN 'no_paid_tokens'
        WHEN r.cumulative_paid > v_paid_bal THEN 'tokens_used'
        ELSE NULL
      END                                               AS not_refundable_reason,
      NULL::uuid                                        AS pending_request_id
    FROM running r
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_id',              rf.order_id,
      'order_number',          rf.order_number,
      'created_at',            rf.created_at,
      'total_price',           rf.total_price,
      'paid_tokens_granted',   rf.paid_tokens_granted,
      'bonus_tokens_granted',  rf.bonus_tokens_granted,
      'is_refundable',         rf.is_refundable,
      'not_refundable_reason', rf.not_refundable_reason,
      'pending_request_id',    rf.pending_request_id
    )
    ORDER BY rf.created_at DESC
  )
  INTO v_result
  FROM refundability rf;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
