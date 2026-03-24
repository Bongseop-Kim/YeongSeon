-- =============================================================
-- confirm_payment_test.sql  –  confirm_payment_orders RPC 테스트
-- 커버 범위:
--   - token 주문 결제 확정 (상태 전이, 토큰 지급, 로그)
--   - 에러: null user_id, null payment_key, 없는 그룹, 소유자 불일치, 상태 불일치
-- =============================================================

BEGIN;
SELECT plan(9);

-- ── 픽스처 UUIDs ────────────────────────────────────────────
-- user A: 토큰 주문 소유자
-- user B: 다른 사용자 (소유권 불일치 테스트)
-- order_1: user A의 토큰 주문 (status='결제중')
-- order_2: user A의 토큰 주문 (status='완료', 상태 불일치 테스트)
-- order_3: user B의 주문 (소유권 불일치 테스트)

DO $setup$
DECLARE
  v_user_a  uuid := 'ca000001-0000-0000-0000-000000000001';
  v_user_b  uuid := 'ca000001-0000-0000-0000-000000000002';
  v_order_1 uuid := 'ca100001-aaaa-0000-0000-000000000001';
  v_order_2 uuid := 'ca200002-aaaa-0000-0000-000000000002';
  v_order_3 uuid := 'ca300003-aaaa-0000-0000-000000000003';
  v_grp_1   uuid := 'ca000001-bbbb-0000-0000-000000000001';
  v_grp_2   uuid := 'ca000001-bbbb-0000-0000-000000000002';
  v_grp_3   uuid := 'ca000001-bbbb-0000-0000-000000000003';
BEGIN
  PERFORM test_helpers.create_test_user(v_user_a);
  PERFORM test_helpers.create_test_user(v_user_b);

  -- order_1: 결제중 token order (메인 성공 케이스)
  PERFORM test_helpers.create_token_order(
    v_user_a, '결제중', 50, 'starter',
    NULL, v_order_1, v_grp_1
  );

  -- order_2: 완료 token order (상태 불일치 케이스)
  PERFORM test_helpers.create_token_order(
    v_user_a, '완료', 30, 'popular',
    'existing-payment-key', v_order_2, v_grp_2
  );

  -- order_3: user B 소유 token order (소유권 불일치 케이스)
  PERFORM test_helpers.create_token_order(
    v_user_b, '결제중', 20, 'starter',
    NULL, v_order_3, v_grp_3
  );
END $setup$;

-- ── 테스트 1: 정상 확정 - 예외 없이 실행 ───────────────────
SELECT lives_ok(
  $$
    SELECT public.confirm_payment_orders(
      'ca000001-bbbb-0000-0000-000000000001'::uuid,  -- payment_group_id
      'ca000001-0000-0000-0000-000000000001'::uuid,  -- user_id
      'toss-payment-key-test-001'
    )
  $$,
  '정상 토큰 주문 확정이 예외 없이 실행됨'
);

-- ── 테스트 2: 주문 상태 '완료'로 변경 ───────────────────────
SELECT is(
  (SELECT status FROM public.orders
   WHERE id = 'ca100001-aaaa-0000-0000-000000000001'::uuid),
  '완료',
  '토큰 주문 상태가 완료로 변경됨'
);

-- ── 테스트 3: design_tokens 행 삽입 ─────────────────────────
SELECT is(
  (SELECT COUNT(*)::int FROM public.design_tokens
   WHERE user_id  = 'ca000001-0000-0000-0000-000000000001'::uuid
     AND type       = 'purchase'
     AND token_class = 'paid'
     AND work_id    = 'order_ca100001-aaaa-0000-0000-000000000001_paid'),
  1,
  '토큰 지급 ledger가 design_tokens에 삽입됨'
);

-- ── 테스트 4: order_status_logs 행 삽입 ─────────────────────
SELECT is(
  (SELECT COUNT(*)::int FROM public.order_status_logs
   WHERE order_id   = 'ca100001-aaaa-0000-0000-000000000001'::uuid
     AND new_status = '완료'),
  1,
  '상태 전이 기록이 order_status_logs에 삽입됨'
);

-- ── 테스트 5: null p_user_id → Forbidden ────────────────────
SELECT throws_ok(
  $$
    SELECT public.confirm_payment_orders(
      'ca000001-bbbb-0000-0000-000000000001'::uuid,
      NULL::uuid,
      'some-key'
    )
  $$,
  'P0001', NULL,
  'null user_id로 호출 시 Forbidden 예외 발생'
);

-- ── 테스트 6: null payment_key → payment_key is required ────
SELECT throws_ok(
  $$
    SELECT public.confirm_payment_orders(
      'ca000001-bbbb-0000-0000-000000000001'::uuid,
      'ca000001-0000-0000-0000-000000000001'::uuid,
      NULL::text
    )
  $$,
  'P0001', NULL,
  'null payment_key로 호출 시 예외 발생'
);

-- ── 테스트 7: 존재하지 않는 payment_group_id → 예외 ─────────
SELECT throws_ok(
  $$
    SELECT public.confirm_payment_orders(
      'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
      'ca000001-0000-0000-0000-000000000001'::uuid,
      'some-key'
    )
  $$,
  'P0001', NULL,
  '존재하지 않는 payment_group_id로 호출 시 예외 발생'
);

-- ── 테스트 8: 소유자 불일치 → Forbidden ─────────────────────
-- order_3은 user_b 소유, user_a ID로 확정 시도
SELECT throws_ok(
  $$
    SELECT public.confirm_payment_orders(
      'ca000001-bbbb-0000-0000-000000000003'::uuid,  -- order_3의 group_id
      'ca000001-0000-0000-0000-000000000001'::uuid,  -- user_a (소유자 아님)
      'some-key'
    )
  $$,
  'P0001', NULL,
  '주문 소유자가 아닌 user_id로 호출 시 Forbidden 예외 발생'
);

-- ── 테스트 9: 결제중 아닌 주문 확정 시도 → 예외 ─────────────
-- order_2는 이미 완료 상태
SELECT throws_ok(
  $$
    SELECT public.confirm_payment_orders(
      'ca000001-bbbb-0000-0000-000000000002'::uuid,  -- order_2의 group_id
      'ca000001-0000-0000-0000-000000000001'::uuid,
      'some-key'
    )
  $$,
  'P0001', NULL,
  '결제중이 아닌 주문 확정 시도 시 예외 발생'
);

SELECT * FROM finish();
ROLLBACK;
