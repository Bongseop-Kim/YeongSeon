-- =============================================================
-- repair_shipping_test.sql  –  수선품 발송 개편 테스트
-- 커버 범위:
--   - create_order_txn: 방문 수거 신청(수거비 합산/스냅샷), 직접 발송, 검증 에러
--   - confirm_payment_orders: pickup → 수거예정 / direct → 발송대기
--   - submit_repair_no_tracking: 발송확인중 전이 + 접수 기록
--   - submit_repair_tracking: 상태 가드
--   - admin_update_order_status: 수거예정/발송확인중 → 접수
--   - get_order_customer_actions: 새 상태에서 취소 가능
-- =============================================================

BEGIN;
SELECT plan(15);

-- ── 픽스처 ──────────────────────────────────────────────────
DO $setup$
DECLARE
  v_user  uuid := 'd0000001-0000-0000-0000-000000000001';
  v_admin uuid := 'd0000001-0000-0000-0000-000000000002';
  v_addr  uuid := 'd0000001-aaaa-0000-0000-000000000001';
BEGIN
  PERFORM test_helpers.create_test_user(v_user);
  PERFORM test_helpers.create_test_user(v_admin);
  PERFORM test_helpers.create_test_profile(v_admin, 'admin', '관리자');

  INSERT INTO public.shipping_addresses (
    id, user_id, recipient_name, recipient_phone, address, postal_code, is_default
  ) VALUES (
    v_addr, v_user, '홍길동', '010-0000-0000', '대전 동구 우암로', '34850', true
  );
END $setup$;

-- 주문 소유자 인증
SELECT test_helpers.set_auth('d0000001-0000-0000-0000-000000000001'::uuid);

-- 방문 수거 주문 생성
CREATE TEMP TABLE t_pickup_result AS
SELECT public.create_order_txn(
  'd0000001-aaaa-0000-0000-000000000001'::uuid,
  jsonb_build_array(jsonb_build_object(
    'item_id', 'repair-item-pickup',
    'item_type', 'reform',
    'product_id', null,
    'selected_option_id', null,
    'quantity', 1,
    'applied_user_coupon_id', null,
    'reform_data', jsonb_build_object(
      'tie', jsonb_build_object('id', 'tie-1'),
      'cost', 0
    )
  )),
  jsonb_build_object(
    'method', 'pickup',
    'pickup', jsonb_build_object(
      'recipient_name', '김수거',
      'recipient_phone', '010-1234-5678',
      'postal_code', '34850',
      'address', '대전 동구 우암로 100',
      'detail_address', '101호'
    )
  )
) AS r;

-- ── 테스트 1: 총액 = 수선비 + 택배비 + 수거비 ───────────────
SELECT is(
  (SELECT (r->>'total_amount')::integer FROM t_pickup_result),
  (SELECT sum(amount)::integer FROM public.pricing_constants
   WHERE key IN ('REFORM_BASE_COST', 'REFORM_SHIPPING_COST', 'REFORM_PICKUP_FEE')),
  '방문 수거 주문 총액에 수거비가 합산됨'
);

-- ── 테스트 2: 수거 신청 정보 + 수거비 스냅샷 저장 ───────────
SELECT is(
  (SELECT count(*)::integer
   FROM public.repair_pickup_requests rp
   JOIN public.orders o ON o.id = rp.order_id
   WHERE o.user_id = 'd0000001-0000-0000-0000-000000000001'::uuid
     AND rp.recipient_name = '김수거'
     AND rp.address = '대전 동구 우암로 100'
     AND rp.pickup_fee = (SELECT amount FROM public.pricing_constants WHERE key = 'REFORM_PICKUP_FEE')),
  1,
  '수거 신청 정보가 수거비 스냅샷과 함께 저장됨'
);

-- 직접 발송 주문 생성
CREATE TEMP TABLE t_direct_result AS
SELECT public.create_order_txn(
  'd0000001-aaaa-0000-0000-000000000001'::uuid,
  jsonb_build_array(jsonb_build_object(
    'item_id', 'repair-item-direct',
    'item_type', 'reform',
    'product_id', null,
    'selected_option_id', null,
    'quantity', 1,
    'applied_user_coupon_id', null,
    'reform_data', jsonb_build_object(
      'tie', jsonb_build_object('id', 'tie-2'),
      'cost', 0
    )
  )),
  jsonb_build_object('method', 'direct')
) AS r;

-- ── 테스트 3: 직접 발송 주문엔 수거비 미합산 ────────────────
SELECT is(
  (SELECT (r->>'total_amount')::integer FROM t_direct_result),
  (SELECT sum(amount)::integer FROM public.pricing_constants
   WHERE key IN ('REFORM_BASE_COST', 'REFORM_SHIPPING_COST')),
  '직접 발송 주문 총액에는 수거비가 합산되지 않음'
);

-- ── 테스트 4: 수거 신청에 수거지 정보 누락 시 에러 ──────────
SELECT throws_ok(
  $$
    SELECT public.create_order_txn(
      'd0000001-aaaa-0000-0000-000000000001'::uuid,
      jsonb_build_array(jsonb_build_object(
        'item_id', 'repair-item-bad',
        'item_type', 'reform',
        'product_id', null,
        'selected_option_id', null,
        'quantity', 1,
        'applied_user_coupon_id', null,
        'reform_data', jsonb_build_object(
          'tie', jsonb_build_object('id', 'tie-3'),
          'cost', 0
        )
      )),
      jsonb_build_object('method', 'pickup')
    )
  $$,
  'Pickup info is required',
  '수거지 정보 없이 방문 수거 신청 시 에러'
);

-- 주문 id 픽스처 테이블
CREATE TEMP TABLE t_orders AS
SELECT
  (SELECT o.id FROM public.orders o
   JOIN public.repair_pickup_requests rp ON rp.order_id = o.id
   WHERE o.user_id = 'd0000001-0000-0000-0000-000000000001'::uuid) AS pickup_order_id,
  (SELECT o.id FROM public.orders o
   WHERE o.user_id = 'd0000001-0000-0000-0000-000000000001'::uuid
     AND o.order_type = 'repair'
     AND NOT EXISTS (
       SELECT 1 FROM public.repair_pickup_requests rp WHERE rp.order_id = o.id
     )) AS direct_order_id;

-- 결제 확정 준비: 두 주문 모두 '결제중'으로
UPDATE public.orders SET status = '결제중'
WHERE id IN (SELECT pickup_order_id FROM t_orders UNION SELECT direct_order_id FROM t_orders);

-- 결제 확정 (service_role)
SELECT test_helpers.set_service_role();
DO $confirm$
DECLARE
  v_user uuid := 'd0000001-0000-0000-0000-000000000001';
BEGIN
  PERFORM public.confirm_payment_orders(
    (SELECT (r->>'payment_group_id')::uuid FROM t_pickup_result),
    v_user, 'toss-key-repair-pickup'
  );
  PERFORM public.confirm_payment_orders(
    (SELECT (r->>'payment_group_id')::uuid FROM t_direct_result),
    v_user, 'toss-key-repair-direct'
  );
END $confirm$;

-- ── 테스트 5: 수거 신청 주문은 결제 후 '수거예정' ───────────
SELECT is(
  (SELECT status FROM public.orders WHERE id = (SELECT pickup_order_id FROM t_orders)),
  '수거예정',
  '방문 수거 주문은 결제 확정 후 수거예정 상태'
);

-- ── 테스트 6: 직접 발송 주문은 결제 후 '발송대기' ───────────
SELECT is(
  (SELECT status FROM public.orders WHERE id = (SELECT direct_order_id FROM t_orders)),
  '발송대기',
  '직접 발송 주문은 결제 확정 후 발송대기 상태'
);

-- ── 테스트 7~9: 송장 없는 접수 ──────────────────────────────
SELECT test_helpers.set_auth('d0000001-0000-0000-0000-000000000001'::uuid);

SELECT lives_ok(
  $$
    SELECT public.submit_repair_no_tracking(
      (SELECT direct_order_id FROM t_orders),
      'quick',
      '오전에 퀵으로 보냈습니다',
      '[]'::jsonb
    )
  $$,
  '송장 없는 발송 접수가 예외 없이 실행됨'
);

SELECT is(
  (SELECT status FROM public.orders WHERE id = (SELECT direct_order_id FROM t_orders)),
  '발송확인중',
  '송장 없는 접수 후 발송확인중 상태'
);

SELECT is(
  (SELECT count(*)::integer FROM public.repair_shipping_receipts
   WHERE order_id = (SELECT direct_order_id FROM t_orders)
     AND receipt_type = 'no_tracking'
     AND reason = 'quick'
     AND memo = '오전에 퀵으로 보냈습니다'),
  1,
  '접수 사유/메모가 기록됨'
);

-- ── 테스트 10: 유효하지 않은 사유 에러 ──────────────────────
SELECT throws_like(
  $$
    SELECT public.submit_repair_no_tracking(
      (SELECT pickup_order_id FROM t_orders),
      'invalid-reason',
      null,
      '[]'::jsonb
    )
  $$,
  '%접수 사유를 선택해주세요%',
  '허용되지 않은 사유로 접수 시 에러'
);

-- ── 테스트 11: 발송확인중 상태에서 송장 등록 불가 ───────────
-- (택배사 목록은 프론트 단일 소스 — 새 코드 'cupost'도 형식 검증을 통과해
--  상태 가드까지 도달하는지 함께 확인)
SELECT throws_like(
  $$
    SELECT public.submit_repair_tracking(
      (SELECT direct_order_id FROM t_orders),
      'cupost',
      '1234567890',
      '[]'::jsonb
    )
  $$,
  '%발송대기 상태에서만%',
  '발송확인중 상태에서는 송장 등록 불가 (신규 택배사 코드 형식 통과)'
);

-- ── 테스트 11b: 잘못된 형식의 택배사 코드 거부 ──────────────
SELECT throws_like(
  $$
    SELECT public.submit_repair_tracking(
      (SELECT direct_order_id FROM t_orders),
      'CJ대한통운!',
      '1234567890',
      '[]'::jsonb
    )
  $$,
  '%올바르지 않은 택배사 코드%',
  '형식에 맞지 않는 택배사 코드는 거부됨'
);

-- ── 테스트 12~13: 관리자 입고 확인 (→ 접수) ─────────────────
SELECT test_helpers.set_auth('d0000001-0000-0000-0000-000000000002'::uuid);

DO $admin$
BEGIN
  PERFORM public.admin_update_order_status(
    (SELECT direct_order_id FROM t_orders), '접수', '입고 확인', false
  );
  PERFORM public.admin_update_order_status(
    (SELECT pickup_order_id FROM t_orders), '접수', '수거 완료', false
  );
END $admin$;

SELECT is(
  (SELECT status FROM public.orders WHERE id = (SELECT direct_order_id FROM t_orders)),
  '접수',
  '발송확인중 → 접수 전이 가능'
);

SELECT is(
  (SELECT status FROM public.orders WHERE id = (SELECT pickup_order_id FROM t_orders)),
  '접수',
  '수거예정 → 접수 전이 가능'
);

-- ── 테스트 14: 새 상태에서 고객 취소 액션 노출 ──────────────
SELECT ok(
  'claim_cancel' = ANY (public.get_order_customer_actions('repair', '수거예정'))
    AND 'claim_cancel' = ANY (public.get_order_customer_actions('repair', '발송확인중')),
  '수거예정/발송확인중 상태에서 취소 액션 노출'
);

SELECT * FROM finish();
ROLLBACK;
