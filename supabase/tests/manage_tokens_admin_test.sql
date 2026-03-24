-- =============================================================
-- manage_tokens_admin_test.sql  –  manage_design_tokens_admin RPC 테스트
-- 커버 범위:
--   - 관리자 토큰 지급 (양수)
--   - 관리자 토큰 차감 (음수)
--   - 에러: 잔액 부족, 금액 0, 빈 설명, 비관리자
-- =============================================================

BEGIN;
SELECT plan(7);

-- ── 픽스처 설정 ─────────────────────────────────────────────
-- admin_user: profiles.role='admin'
-- target_user: auth.users만 (profile 없음 → 초기 토큰 트리거 미발동)
--   → 초기 잔액 = 0

DO $setup$
DECLARE
  v_admin  uuid := 'cc000001-0000-0000-0000-000000000001';
  v_target uuid := 'cc000001-0000-0000-0000-000000000002';
BEGIN
  -- 관리자 생성
  PERFORM test_helpers.create_test_user(v_admin);
  PERFORM test_helpers.create_test_profile(v_admin, 'admin', '관리자');

  -- 대상 사용자: auth.users만 (profile INSERT 없음 → 트리거 미발동)
  PERFORM test_helpers.create_test_user(v_target);
END $setup$;

-- 관리자 인증 컨텍스트 설정
SELECT test_helpers.set_auth(
  'cc000001-0000-0000-0000-000000000001'::uuid,
  'authenticated'
);

-- ── 테스트 1: 토큰 지급 (100개) - 성공 ──────────────────────
SELECT is(
  (SELECT (public.manage_design_tokens_admin(
    'cc000001-0000-0000-0000-000000000002'::uuid,
    100,
    '테스트용 토큰 지급'
  ))->>'success'),
  'true',
  '관리자 토큰 지급 시 success=true 반환'
);

-- ── 테스트 2: 지급 후 new_balance = 100 ────────────────────
SELECT is(
  (SELECT (public.manage_design_tokens_admin(
    'cc000001-0000-0000-0000-000000000002'::uuid,
    100,
    '두 번째 테스트용 토큰 지급'
  ))->>'new_balance'),
  '200',
  '두 번째 지급 후 new_balance=200 반환'
);

-- ── 테스트 3: 토큰 차감 (50개) - 성공 ───────────────────────
-- 현재 잔액 200 → 50 차감 → 150
SELECT is(
  (SELECT (public.manage_design_tokens_admin(
    'cc000001-0000-0000-0000-000000000002'::uuid,
    -50,
    '테스트용 토큰 차감'
  ))->>'new_balance'),
  '150',
  '토큰 차감 후 new_balance=150 반환'
);

-- ── 테스트 4: 잔액 초과 차감 → 예외 ────────────────────────
-- 현재 잔액 150, 200 차감 시도
SELECT throws_ok(
  $$
    SELECT public.manage_design_tokens_admin(
      'cc000001-0000-0000-0000-000000000002'::uuid,
      -200,
      '잔액 초과 차감 테스트'
    )
  $$,
  'P0001', NULL,
  '잔액 초과 차감 시 예외 발생'
);

-- ── 테스트 5: amount=0 → 예외 ───────────────────────────────
SELECT throws_ok(
  $$
    SELECT public.manage_design_tokens_admin(
      'cc000001-0000-0000-0000-000000000002'::uuid,
      0,
      '0 금액 테스트'
    )
  $$,
  'P0001', NULL,
  'amount=0으로 호출 시 예외 발생'
);

-- ── 테스트 6: 빈 description → 예외 ────────────────────────
SELECT throws_ok(
  $$
    SELECT public.manage_design_tokens_admin(
      'cc000001-0000-0000-0000-000000000002'::uuid,
      10,
      ''
    )
  $$,
  'P0001', NULL,
  '빈 description으로 호출 시 예외 발생 (감사 추적 필수)'
);

-- ── 테스트 7: 비관리자 호출 → 예외 ──────────────────────────
DO $ctx$ BEGIN
  PERFORM test_helpers.set_auth(
    'cc000001-0000-0000-0000-000000000002'::uuid,  -- 일반 사용자 (profile 없음)
    'authenticated'
  );
END $ctx$;

SELECT throws_ok(
  $$
    SELECT public.manage_design_tokens_admin(
      'cc000001-0000-0000-0000-000000000002'::uuid,
      10,
      '비관리자 접근 시도'
    )
  $$,
  'P0001', NULL,
  '비관리자 호출 시 예외 발생'
);

SELECT * FROM finish();
ROLLBACK;
