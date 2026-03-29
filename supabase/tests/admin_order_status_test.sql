-- =============================================================
-- admin_order_status_test.sql  –  admin_update_order_status RPC 테스트
-- 커버 범위:
--   - sale 순방향 전이 (대기중 → 진행중)
--   - token 주문 완료 전이 (토큰 지급)
--   - custom 롤백 전이 (사유 필수)
--   - 에러: 롤백 사유 없음, 유효하지 않은 전이, 비관리자
-- =============================================================

BEGIN;
SELECT plan(9);

-- ── 픽스처 UUIDs ────────────────────────────────────────────
-- admin_user: profiles.role='admin' 보유
-- order_user: 실제 주문 소유자
-- sale_order: '대기중' status
-- token_order: '대기중' + payment_key 설정 (완료 전이 가능)
-- custom_order: '제작중' status (롤백 테스트)

DO $setup$
DECLARE
  v_admin  uuid := 'a0000001-0000-0000-0000-000000000001';
  v_user   uuid := 'a0000001-0000-0000-0000-000000000002';
  v_sale   uuid;
  v_token  uuid;
  v_custom uuid;
BEGIN
  -- 관리자 생성: auth.users + profile(role='admin')
  PERFORM test_helpers.create_test_user(v_admin);
  PERFORM test_helpers.create_test_profile(v_admin, 'admin', '관리자');

  -- 일반 사용자 생성
  PERFORM test_helpers.create_test_user(v_user);

  -- sale order: '대기중'
  v_sale := test_helpers.create_sale_order(v_user, '대기중');
  -- order_id를 나중에 참조하기 위해 order_number로 구분 가능하도록
  UPDATE public.orders SET order_number = 'TST-SALE-AO001' WHERE id = v_sale;

  -- token order: '대기중' + payment_key (완료 전이 조건)
  PERFORM test_helpers.create_token_order(
    v_user, '대기중', 50, 'starter',
    'toss-key-for-admin-test'
  );
  UPDATE public.orders SET order_number = 'TST-TOKEN-AO001'
  WHERE order_type = 'token' AND status = '대기중' AND user_id = v_user;

  -- custom order: '제작중' (롤백 테스트)
  v_custom := test_helpers.create_custom_order(v_user, '제작중');
  UPDATE public.orders SET order_number = 'TST-CUSTOM-AO001' WHERE id = v_custom;
END $setup$;

-- 관리자 인증 컨텍스트 설정
SELECT test_helpers.set_auth(
  'a0000001-0000-0000-0000-000000000001'::uuid,
  'authenticated'
);

-- ── 테스트 1: sale 순방향 전이 (대기중 → 진행중) ─────────────
SELECT is(
  (SELECT (public.admin_update_order_status(
    (SELECT id FROM public.orders WHERE order_number = 'TST-SALE-AO001'),
    '진행중'
  ))->>'success'),
  'true',
  'sale 주문 대기중 → 진행중 전이 성공'
);

-- ── 테스트 2: 주문 상태 변경 확인 ───────────────────────────
SELECT is(
  (SELECT status FROM public.orders WHERE order_number = 'TST-SALE-AO001'),
  '진행중',
  'sale 주문 상태가 진행중으로 변경됨'
);

-- ── 테스트 3: order_status_logs 기록 확인 ───────────────────
SELECT is(
  (SELECT COUNT(*)::int FROM public.order_status_logs
   WHERE order_id = (SELECT id FROM public.orders WHERE order_number = 'TST-SALE-AO001')
     AND new_status = '진행중'),
  1,
  'order_status_logs에 상태 전이 기록이 삽입됨'
);

-- ── 테스트 4: token 주문 관리자 완료 전이 차단 ───────────────
-- token 완료는 confirm_payment 흐름에서만 허용. 관리자 수동 완료 불가.
SELECT throws_ok(
  $$
    SELECT public.admin_update_order_status(
      (SELECT id FROM public.orders WHERE order_number = 'TST-TOKEN-AO001'),
      '완료'
    )
  $$,
  'P0001', NULL,
  'token 주문 관리자 완료 전이 시 예외 발생'
);

-- ── 테스트 5: token 완료 차단 후 design_tokens 미지급 확인 ───
SELECT is(
  (SELECT COUNT(*)::int FROM public.design_tokens
   WHERE user_id = 'a0000001-0000-0000-0000-000000000002'::uuid
     AND type = 'purchase'
     AND work_id = 'order_' || (SELECT id FROM public.orders WHERE order_number = 'TST-TOKEN-AO001')::text),
  0,
  'token 주문 관리자 완료 차단 시 design_tokens 미지급'
);

-- ── 테스트 6: 롤백 전이 (custom 제작중 → 접수, 사유 있음) ────
SELECT is(
  (SELECT (public.admin_update_order_status(
    (SELECT id FROM public.orders WHERE order_number = 'TST-CUSTOM-AO001'),
    '접수',
    '고객 요청으로 롤백',
    NULL,  -- p_payment_key
    true   -- p_is_rollback = true
  ))->>'success'),
  'true',
  'custom 주문 제작중 → 접수 롤백 전이 성공'
);

-- ── 테스트 7: 롤백 시 사유 없음 → 예외 ─────────────────────
-- TST-CUSTOM-AO001은 이제 '접수' 상태 → 대기중으로 롤백 시도
SELECT throws_ok(
  $$
    SELECT public.admin_update_order_status(
      (SELECT id FROM public.orders WHERE order_number = 'TST-CUSTOM-AO001'),
      '대기중',
      NULL,  -- p_memo 없음
      NULL,  -- p_payment_key
      true   -- p_is_rollback = true
    )
  $$,
  'P0001', NULL,
  '롤백 시 memo 없으면 예외 발생'
);

-- ── 테스트 8: 유효하지 않은 전이 → 예외 ─────────────────────
-- sale 주문 (현재 '진행중') → 배송완료 (진행중 → 배송완료는 유효하지 않음)
SELECT throws_ok(
  $$
    SELECT public.admin_update_order_status(
      (SELECT id FROM public.orders WHERE order_number = 'TST-SALE-AO001'),
      '배송완료'
    )
  $$,
  'P0001', NULL,
  '유효하지 않은 상태 전이 시도 시 예외 발생'
);

-- ── 테스트 9: 비관리자 호출 → 예외 ──────────────────────────
DO $ctx$ BEGIN
  PERFORM test_helpers.set_auth(
    'a0000001-0000-0000-0000-000000000002'::uuid,  -- 일반 사용자
    'authenticated'
  );
END $ctx$;

SELECT throws_ok(
  $$
    SELECT public.admin_update_order_status(
      (SELECT id FROM public.orders WHERE order_number = 'TST-SALE-AO001'),
      '배송중'
    )
  $$,
  'P0001', NULL,
  '비관리자 호출 시 예외 발생'
);

SELECT * FROM finish();
ROLLBACK;
