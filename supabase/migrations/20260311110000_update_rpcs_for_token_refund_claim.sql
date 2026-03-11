-- =============================================================
-- 20260311110000_update_rpcs_for_token_refund_claim.sql
-- token_refund_requests 테이블 제거에 따라
-- 토큰 환불 관련 RPC를 claims 테이블 기반으로 재작성
-- =============================================================

-- ── admin_update_claim_status ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_update_claim_status(
  p_claim_id uuid,
  p_new_status text,
  p_memo text DEFAULT NULL,
  p_is_rollback boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_admin_id uuid;
  v_current_status text;
  v_claim_type text;
begin
  v_admin_id := auth.uid();
  if v_admin_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  -- Lock the row and get current status + claim type
  select c.status, c.type
  into v_current_status, v_claim_type
  from public.claims c
  where c.id = p_claim_id
  for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  if v_current_status = p_new_status then
    raise exception 'Status is already %', p_new_status;
  end if;

  if p_is_rollback then
    -- Rollback requires memo
    if p_memo is null or trim(p_memo) = '' then
      raise exception '롤백 시 사유 입력 필수';
    end if;

    -- Validate rollback transition by claim type
    -- Special: 거부 → 접수 allowed for all types (오거부 복원)
    if v_current_status = '거부' and p_new_status = '접수' then
      -- allowed for all claim types
      null;
    elsif v_claim_type = 'cancel' then
      if not (v_current_status = '처리중' and p_new_status = '접수') then
        raise exception 'Invalid rollback from "%" to "%" for cancel claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'return' then
      if not (v_current_status = '수거요청' and p_new_status = '접수') then
        raise exception 'Invalid rollback from "%" to "%" for return claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'exchange' then
      if not (v_current_status = '수거요청' and p_new_status = '접수') then
        raise exception 'Invalid rollback from "%" to "%" for exchange claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'token_refund' then
      -- token_refund는 거부→접수 롤백만 허용 (is_rollback=true 공통 허용 로직으로 처리됨)
      if not (v_current_status = '처리중' and p_new_status = '접수') then
        raise exception 'Invalid rollback from "%" to "%" for token_refund claim', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown claim type: %', v_claim_type;
    end if;
  else
    -- Validate forward state transition by claim type
    if v_claim_type = 'cancel' then
      if not (
        (v_current_status = '접수' and p_new_status = '처리중')
        or (v_current_status = '처리중' and p_new_status = '완료')
        or (p_new_status = '거부' and v_current_status in ('접수', '처리중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for cancel claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'return' then
      if not (
        (v_current_status = '접수' and p_new_status = '수거요청')
        or (v_current_status = '수거요청' and p_new_status = '수거완료')
        or (v_current_status = '수거완료' and p_new_status = '완료')
        or (p_new_status = '거부' and v_current_status in ('접수', '수거요청', '수거완료'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for return claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'exchange' then
      if not (
        (v_current_status = '접수' and p_new_status = '수거요청')
        or (v_current_status = '수거요청' and p_new_status = '수거완료')
        or (v_current_status = '수거완료' and p_new_status = '재발송')
        or (v_current_status = '재발송' and p_new_status = '완료')
        or (p_new_status = '거부' and v_current_status in ('접수', '수거요청', '수거완료', '재발송'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for exchange claim', v_current_status, p_new_status;
      end if;
    elsif v_claim_type = 'token_refund' then
      -- 수거/재발송 전이 없음: 접수→처리중→완료/거부만 허용
      if not (
        (v_current_status = '접수' and p_new_status = '처리중')
        or (v_current_status = '처리중' and p_new_status = '완료')
        or (p_new_status = '거부' and v_current_status in ('접수', '처리중'))
      ) then
        raise exception 'Invalid transition from "%" to "%" for token_refund claim', v_current_status, p_new_status;
      end if;
    else
      raise exception 'Unknown claim type: %', v_claim_type;
    end if;
  end if;

  -- Update claim status
  update public.claims
  set status = p_new_status
  where id = p_claim_id;

  -- Insert status log
  insert into public.claim_status_logs (
    claim_id,
    changed_by,
    previous_status,
    new_status,
    memo,
    is_rollback
  )
  values (
    p_claim_id,
    v_admin_id,
    v_current_status,
    p_new_status,
    p_memo,
    p_is_rollback
  );

  return jsonb_build_object(
    'success', true,
    'previous_status', v_current_status,
    'new_status', p_new_status
  );
end;
$$;

-- ── use_design_tokens ─────────────────────────────────────────
-- SECURITY DEFINER 유지 사유: advisory lock + design_tokens INSERT는 RLS로 허용되지 않음
-- service_role(Edge Function)에서 호출 시 소유권 검증 면제
-- 차감 순서: 유료 먼저, 부족분은 보너스에서
-- Returns: { success, cost, balance } or { success: false, error: '...', balance, cost }
CREATE OR REPLACE FUNCTION public.use_design_tokens(
  p_user_id      uuid,
  p_ai_model     text,             -- 'openai' | 'gemini'
  p_request_type text,            -- 'text_only' | 'text_and_image'
  p_quality      text DEFAULT 'standard'  -- 'high' | 'standard'
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
  v_caller_role  text;
BEGIN
  -- 소유권 검증: service_role이 아닌 경우 auth.uid() 일치 확인
  v_caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  IF v_caller_role IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not own this resource';
  END IF;

  -- 파라미터 화이트리스트 검증
  IF p_ai_model NOT IN ('openai', 'gemini') THEN
    RAISE EXCEPTION 'invalid ai_model: %', p_ai_model;
  END IF;
  IF p_request_type NOT IN ('text_only', 'text_and_image') THEN
    RAISE EXCEPTION 'invalid request_type: %', p_request_type;
  END IF;
  IF p_quality NOT IN ('standard', 'high') THEN
    RAISE EXCEPTION 'invalid quality: %', p_quality;
  END IF;

  -- 동시 요청에 대한 advisory lock (사용자별)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- admin_settings에서 비용 조회
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

  -- pending 환불 체크 (환불 신청 후 토큰 사용 차단)
  IF EXISTS (
    SELECT 1 FROM public.claims
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

  -- 전체 잔액 조회
  SELECT COALESCE(SUM(amount), 0)::integer
  INTO v_total_bal
  FROM public.design_tokens
  WHERE user_id = p_user_id;

  -- 잔액 부족 검사
  IF v_total_bal < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_tokens',
      'balance', v_total_bal,
      'cost', v_cost
    );
  END IF;

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, ai_model, request_type, description
  ) VALUES (
    p_user_id, -v_cost, 'use', 'paid',
    p_ai_model, p_request_type,
    'AI 디자인 생성 (' || p_ai_model || ', ' || p_request_type || ')'
  );

  RETURN jsonb_build_object(
    'success', true,
    'cost', v_cost,
    'balance', v_total_bal - v_cost
  );
END;
$$;

-- ── get_refundable_token_orders ───────────────────────────────
-- 모든 완료된 토큰 주문 목록 + 환불 가능 여부 + 불가 사유 반환 (고객용)
-- SECURITY INVOKER: 소유자 데이터만 조회하므로 RLS로 충분
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
          AND (dt.work_id = 'order_' || o.id::text || '_paid'
               OR dt.work_id = 'order_' || o.id::text)
      ), 0)::integer                                    AS paid_tokens_granted,
      -- 진행 중인 환불 요청 정보 (접수/처리중/완료)
      (
        SELECT jsonb_build_object('id', c.id, 'status', c.status)
        FROM public.claims c
        WHERE c.order_id = o.id
          AND c.type = 'token_refund'
          AND c.status IN ('접수', '처리중', '완료')
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
      'is_refundable',         CASE
                                 WHEN cto.active_refund_request IS NOT NULL THEN false
                                 WHEN cto.order_rank = 1
                                   AND NOT EXISTS (
                                     SELECT 1
                                     FROM public.design_tokens dt
                                     WHERE dt.user_id = v_user_id
                                       AND dt.type = 'use'
                                       AND dt.created_at > cto.created_at
                                   ) THEN true
                                 ELSE false
                               END,
      'not_refundable_reason', CASE
                                 WHEN cto.active_refund_request IS NOT NULL THEN
                                   CASE (cto.active_refund_request->>'status')
                                     WHEN '접수' THEN 'pending_refund'
                                     WHEN '처리중' THEN 'pending_refund'
                                     WHEN '완료' THEN 'approved_refund'
                                     ELSE 'active_refund'
                                   END
                                 WHEN cto.order_rank = 1
                                   AND NOT EXISTS (
                                     SELECT 1
                                     FROM public.design_tokens dt
                                     WHERE dt.user_id = v_user_id
                                       AND dt.type = 'use'
                                       AND dt.created_at > cto.created_at
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
      RANK() OVER (ORDER BY cto.created_at DESC) AS order_rank
    FROM completed_token_orders cto
  ) cto;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ── request_token_refund ──────────────────────────────────────
-- 환불 신청 (고객용)
-- SECURITY DEFINER 사유: claims INSERT는 RPC 전용 (auth.uid() 소유권 검증 포함)
CREATE OR REPLACE FUNCTION public.request_token_refund(
  p_order_id uuid,
  p_reason   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id         uuid;
  v_order           record;
  v_latest_order_id uuid;
  v_paid_granted    integer;
  v_refund_amount   integer;
  v_token_item_id   uuid;
  v_claim_id        uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  -- 주문 검증: 본인 소유 + 토큰 주문 + 완료 상태
  SELECT id, user_id, total_price, order_type, status, created_at
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not found';
  END IF;

  IF v_order.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Forbidden: order not owned by user';
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

  SELECT id
    INTO v_latest_order_id
    FROM public.orders
   WHERE user_id = v_user_id
     AND order_type = 'token'
     AND status = '완료'
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_latest_order_id IS DISTINCT FROM p_order_id THEN
    RAISE EXCEPTION 'not the latest order';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.design_tokens dt
    WHERE dt.user_id = v_user_id
      AND dt.type = 'use'
      AND dt.created_at > v_order.created_at
  ) THEN
    RAISE EXCEPTION 'tokens_used_after_order';
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

-- ── cancel_token_refund ───────────────────────────────────────
-- 환불 취소 (고객용)
-- SECURITY DEFINER 사유: claims UPDATE는 RLS로 허용되지 않음
CREATE OR REPLACE FUNCTION public.cancel_token_refund(
  p_request_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_req     record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: must be logged in';
  END IF;

  SELECT c.id, c.user_id, c.status
    INTO v_req
    FROM public.claims c
   WHERE c.id = p_request_id
     AND c.type = 'token_refund'
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund request not found';
  END IF;

  IF v_req.user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Forbidden: refund request not owned by user';
  END IF;

  IF v_req.status != '접수' THEN
    RAISE EXCEPTION 'only pending requests can be cancelled (status: %)', v_req.status;
  END IF;

  UPDATE public.claims
     SET status = '거부',
         updated_at = now()
   WHERE id = p_request_id
     AND type = 'token_refund';
END;
$$;

-- ── approve_token_refund ──────────────────────────────────────
-- 관리자 환불 승인 (service_role 전용, Edge Function에서 Toss 취소 후 호출)
-- SECURITY DEFINER 사유: design_tokens/orders INSERT/UPDATE는 RLS 비허용
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
  v_caller_role       text;
  v_req               record;
  v_paid_token_amount integer;
BEGIN
  -- service_role 전용
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

  IF v_req.status != '접수' THEN
    RAISE EXCEPTION 'refund request is not pending (status: %)', v_req.status;
  END IF;

  v_paid_token_amount := v_req.paid_token_amount;

  -- 유료 토큰 회수
  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, description, work_id
  ) VALUES (
    v_req.user_id, -v_paid_token_amount, 'refund', 'paid',
    '토큰 환불 승인 (유료)',
    'refund_' || p_request_id::text || '_paid'
  )
  ON CONFLICT (work_id) DO NOTHING;

  -- 주문 취소 처리 (전액 환불이므로 항상 취소)
  UPDATE public.orders
     SET status = '취소', updated_at = now()
   WHERE id = v_req.order_id;

  INSERT INTO public.order_status_logs (
    order_id, changed_by, previous_status, new_status, memo
  ) VALUES (
    v_req.order_id, p_admin_id, '완료', '취소',
    '토큰 환불 승인 (request_id: ' || p_request_id::text || ')'
  );

  -- 환불 요청 상태 업데이트
  UPDATE public.claims
     SET status     = '완료',
         updated_at = now()
   WHERE id = p_request_id
     AND type = 'token_refund';
END;
$$;

-- reject_token_refund_admin 삭제
DROP FUNCTION IF EXISTS public.reject_token_refund_admin(uuid, text);

-- get_token_refund_requests_admin 삭제
DROP FUNCTION IF EXISTS public.get_token_refund_requests_admin(text);
