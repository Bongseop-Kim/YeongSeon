-- admin only 체크를 is_admin()에서 role = 'admin' 명시적 검사로 변경
-- request_token_refund SELECT FOR UPDATE에 소유권 체크(user_id = v_user_id) 추가

CREATE OR REPLACE FUNCTION public.manage_design_tokens_admin(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
-- 관리자가 다른 사용자의 토큰을 조정해야 하므로 RLS를 일시적으로 우회하기 위해
-- 이 함수는 SECURITY DEFINER로 실행된다. 이 권한 상승은 관리 토큰 관리(admin)
-- 목적으로만 제한되며, 관리자(admin role)만 호출 가능하다.
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
    -- 차감 경로: 잔액 읽기 전에 advisory lock을 먼저 획득하여
    -- 동시 차감 요청 간의 race condition을 방지한다.
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));
  END IF;

  SELECT COALESCE(SUM(amount), 0)::integer
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

CREATE OR REPLACE FUNCTION public.request_token_refund(
  p_order_id uuid,
  p_reason   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
-- auth.uid() 소유권 검증을 통해 본인 주문만 환불 신청 가능하도록 제한하면서도,
-- claims 테이블 쓰기 및 design_tokens 읽기에 일관된 권한이 필요하므로
-- SECURITY DEFINER로 실행된다. 호출 초기에 v_user_id := auth.uid() 검사로
-- 비인증 접근을 차단하고, 주문 소유권 검증(v_order.user_id = v_user_id)으로
-- 다른 사용자의 주문을 조작하는 것을 방지한다.
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id          uuid;
  v_order            record;
  v_latest_order_id  uuid;
  v_paid_granted     integer;
  v_token_granted_at timestamptz;
  v_refund_amount    integer;
  v_token_item_id    uuid;
  v_claim_id         uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  -- 주문 검증: 본인 소유 + 토큰 주문 + 완료 상태
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

  -- 해당 주문의 유료 지급량 조회
  SELECT
    COALESCE((
      SELECT SUM(dt.amount)
      FROM public.design_tokens dt
      WHERE dt.user_id = v_user_id
        AND dt.type = 'purchase'
        AND dt.token_class = 'paid'
        AND (dt.work_id = 'order_' || p_order_id::text || '_paid'
             OR dt.work_id = 'order_' || p_order_id::text)
    ), 0)::integer
  INTO v_paid_granted;

  IF v_paid_granted <= 0 THEN
    RAISE EXCEPTION 'no paid tokens found for this order';
  END IF;

  SELECT MAX(dt.created_at)
    INTO v_token_granted_at
    FROM public.design_tokens dt
   WHERE dt.user_id = v_user_id
     AND dt.type = 'purchase'
     AND dt.token_class = 'paid'
     AND (dt.work_id = 'order_' || p_order_id::text || '_paid'
          OR dt.work_id = 'order_' || p_order_id::text);

  v_token_granted_at := COALESCE(v_token_granted_at, v_order.created_at);

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

  -- token order_item id 조회
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
      'refund_amount',      v_refund_amount
    )
  )
  RETURNING id INTO v_claim_id;

  RETURN jsonb_build_object(
    'request_id',         v_claim_id,
    'refund_amount',      v_refund_amount,
    'paid_token_amount',  v_paid_granted,
    'bonus_token_amount', 0
  );
END;
$$;
