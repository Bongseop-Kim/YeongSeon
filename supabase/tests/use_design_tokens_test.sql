-- =============================================================
-- use_design_tokens_test.sql  –  use_design_tokens RPC 테스트
-- 커버 범위:
--   - 유료 토큰 차감 (paid 먼저)
--   - 잔액 부족 시 success=false 반환
--   - work_id 기반 멱등성
--   - 파라미터 검증 (invalid ai_model, request_type)
-- =============================================================

BEGIN;
SELECT plan(9);

-- ── 픽스처 설정 ─────────────────────────────────────────────

DO $setup$
DECLARE
  v_user_a uuid := 'dd000001-0000-0000-0000-000000000001';
  v_user_b uuid := 'dd000001-0000-0000-0000-000000000002';
BEGIN
  PERFORM test_helpers.create_test_user(v_user_a);
  PERFORM test_helpers.create_test_user(v_user_b);

  -- user_a: 유료 토큰 100개 (테스트는 superuser로 실행되므로 직접 INSERT 가능)
  INSERT INTO public.design_tokens (user_id, amount, type, token_class, description)
  VALUES (v_user_a, 100, 'grant', 'paid', '테스트용 유료 토큰');

  -- admin_settings: openai/text_only 비용 = 5
  PERFORM test_helpers.ensure_admin_setting('design_token_cost_openai_text', '5');
END $setup$;

-- service_role 컨텍스트 설정 (트랜잭션 내내 유지, 소유권 검증 우회)
SELECT test_helpers.set_service_role();

-- ── 테스트 1: 정상 차감 - 예외 없이 실행 ───────────────────
SELECT lives_ok(
  $$
    SELECT public.use_design_tokens(
      'dd000001-0000-0000-0000-000000000001'::uuid,
      'openai',
      'text_only',
      'standard',
      'work-test-0001'
    )
  $$,
  '유료 토큰 차감이 예외 없이 실행됨'
);

-- ── 테스트 2: 반환값 success=true ───────────────────────────
SELECT is(
  (SELECT (public.use_design_tokens(
    'dd000001-0000-0000-0000-000000000001'::uuid,
    'openai', 'text_only', 'standard', 'work-test-0002'
  ))->>'success'),
  'true',
  '정상 차감 시 success=true 반환'
);

-- ── 테스트 3: 잔액이 비용만큼 감소 ─────────────────────────
-- 초기 100개, test1에서 5차감(-5), test2에서 5차감(-5) = 90
SELECT is(
  (SELECT COALESCE(SUM(amount), 0)::int
   FROM public.design_tokens
   WHERE user_id = 'dd000001-0000-0000-0000-000000000001'::uuid),
  90,
  '토큰 차감 후 잔액이 정확히 감소함'
);

-- ── 테스트 4: work_id 멱등성 - 이미 처리된 work_id 재호출 ──
-- work-test-0001은 테스트1에서 이미 처리됨 → cost=0 반환
SELECT is(
  (SELECT (public.use_design_tokens(
    'dd000001-0000-0000-0000-000000000001'::uuid,
    'openai', 'text_only', 'standard', 'work-test-0001'
  ))->>'cost'),
  '0',
  '이미 처리된 work_id 재호출 시 cost=0 반환 (멱등성)'
);

-- ── 테스트 5: 멱등 호출 후 잔액 변경 없음 ──────────────────
-- 테스트4 호출 후에도 잔액은 90 유지
SELECT is(
  (SELECT COALESCE(SUM(amount), 0)::int
   FROM public.design_tokens
   WHERE user_id = 'dd000001-0000-0000-0000-000000000001'::uuid),
  90,
  '멱등 호출 후 잔액 변경 없음'
);

-- ── 테스트 6: 잔액 부족 - error=insufficient_tokens ─────────
-- user_b는 토큰 없음
SELECT is(
  (SELECT (public.use_design_tokens(
    'dd000001-0000-0000-0000-000000000002'::uuid,
    'openai', 'text_only'
  ))->>'error'),
  'insufficient_tokens',
  '잔액 부족 시 error=insufficient_tokens 반환'
);

-- ── 테스트 7: 잔액 부족 - success=false ─────────────────────
SELECT is(
  (SELECT (public.use_design_tokens(
    'dd000001-0000-0000-0000-000000000002'::uuid,
    'openai', 'text_only'
  ))->>'success'),
  'false',
  '잔액 부족 시 success=false 반환'
);

-- ── 테스트 8: 유효하지 않은 ai_model → 예외 ─────────────────
SELECT throws_ok(
  $$
    SELECT public.use_design_tokens(
      'dd000001-0000-0000-0000-000000000001'::uuid,
      'invalid_model',
      'text_only'
    )
  $$,
  'P0001', NULL,
  '유효하지 않은 ai_model 파라미터로 호출 시 예외 발생'
);

-- ── 테스트 9: 유효하지 않은 request_type → 예외 ─────────────
SELECT throws_ok(
  $$
    SELECT public.use_design_tokens(
      'dd000001-0000-0000-0000-000000000001'::uuid,
      'openai',
      'invalid_type'
    )
  $$,
  'P0001', NULL,
  '유효하지 않은 request_type 파라미터로 호출 시 예외 발생'
);

SELECT * FROM finish();
ROLLBACK;
