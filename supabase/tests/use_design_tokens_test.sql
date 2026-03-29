-- =============================================================
-- use_design_tokens_test.sql  –  use_design_tokens RPC 테스트
-- 커버 범위:
--   - 유료 토큰 차감 (paid 먼저)
--   - 잔액 부족 시 success=false 반환
--   - work_id 기반 멱등성
--   - 파라미터 검증 (invalid ai_model, request_type)
-- =============================================================

BEGIN;
SELECT plan(14);

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

-- ── 테스트 픽스처: 만료 테스트용 사용자 + 주문 + 토큰 설정 ──────────────
DO $expiry_setup$
DECLARE
  v_user_c  uuid := 'dd000001-0000-0000-0000-000000000003';
  v_order_1 uuid := 'eeeeeeee-0000-0000-0000-000000000001';
  v_order_2 uuid := 'eeeeeeee-0000-0000-0000-000000000002';
BEGIN
  PERFORM test_helpers.create_test_user(v_user_c);

  INSERT INTO public.orders (
    id, user_id, order_number, shipping_address_id,
    total_price, original_price, total_discount,
    order_type, status, payment_group_id, shipping_cost
  ) VALUES (
    v_order_1, v_user_c, 'TKN-EXP-001', NULL,
    2900, 2900, 0, 'token', '완료', gen_random_uuid(), 0
  );

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, source_order_id, expires_at, description, work_id
  ) VALUES (
    v_user_c, 50, 'purchase', 'paid',
    v_order_1, now() - interval '1 second',
    '만료된 토큰 (테스트)', 'order_' || v_order_1::text
  );

  INSERT INTO public.orders (
    id, user_id, order_number, shipping_address_id,
    total_price, original_price, total_discount,
    order_type, status, payment_group_id, shipping_cost
  ) VALUES (
    v_order_2, v_user_c, 'TKN-VALID-001', NULL,
    2900, 2900, 0, 'token', '완료', gen_random_uuid(), 0
  );

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, source_order_id, expires_at, description, work_id
  ) VALUES (
    v_user_c, 30, 'purchase', 'paid',
    v_order_2, now() + interval '1 year',
    '유효한 토큰 (테스트)', 'order_' || v_order_2::text
  );
END $expiry_setup$;

-- ── 테스트 10: 만료된 배치는 잔액에 포함되지 않음 ────────────────────────
SELECT is(
  (SELECT COALESCE(SUM(amount) FILTER (
    WHERE token_class = 'paid' AND (expires_at IS NULL OR expires_at > now())
  ), 0)::integer
   FROM public.design_tokens
   WHERE user_id = 'dd000001-0000-0000-0000-000000000003'::uuid),
  30,
  '만료된 배치(50)는 잔액 계산에서 제외되고 유효 배치(30)만 집계됨'
);

-- ── 테스트 11: 만료 토큰만 있을 때 use_design_tokens insufficient_tokens ──
DO $expired_only_setup$
DECLARE
  v_user_d  uuid := 'dd000001-0000-0000-0000-000000000004';
  v_order_d uuid := 'eeeeeeee-0000-0000-0000-000000000004';
BEGIN
  PERFORM test_helpers.create_test_user(v_user_d);
  INSERT INTO public.orders (
    id, user_id, order_number, shipping_address_id,
    total_price, original_price, total_discount,
    order_type, status, payment_group_id, shipping_cost
  ) VALUES (
    v_order_d, v_user_d, 'TKN-EXP-002', NULL,
    2900, 2900, 0, 'token', '완료', gen_random_uuid(), 0
  );
  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, source_order_id, expires_at, description, work_id
  ) VALUES (
    v_user_d, 100, 'purchase', 'paid',
    v_order_d, now() - interval '1 day',
    '만료 전용 테스트', 'order_' || v_order_d::text
  );
END $expired_only_setup$;

SELECT is(
  (SELECT (public.use_design_tokens(
    'dd000001-0000-0000-0000-000000000004'::uuid,
    'openai', 'text_only'
  ))->>'error'),
  'insufficient_tokens',
  '만료 토큰만 있는 사용자: use_design_tokens → insufficient_tokens'
);

-- ── 테스트 12: 유효 배치에서 FIFO 소비 → source_order_id 기록 확인 ─────────
SELECT lives_ok(
  $$
    SELECT public.use_design_tokens(
      'dd000001-0000-0000-0000-000000000003'::uuid,
      'openai', 'text_only', 'standard', 'work-expiry-test-001'
    )
  $$,
  '유효 배치에서 paid 토큰 차감 예외 없이 실행'
);

-- ── 테스트 13: use 항목의 source_order_id가 배치 주문 ID와 일치 ─────────────
SELECT is(
  (SELECT source_order_id::text
   FROM public.design_tokens
   WHERE user_id = 'dd000001-0000-0000-0000-000000000003'::uuid
     AND type = 'use'
     AND work_id = 'work-expiry-test-001_use_paid_0'),
  'eeeeeeee-0000-0000-0000-000000000002',
  'use 항목의 source_order_id가 유효 배치(order_2) ID와 일치'
);

-- ── 테스트 14: use 항목의 expires_at이 배치 expires_at과 일치 ───────────────
SELECT ok(
  (SELECT (expires_at - now()) > interval '364 days'
   FROM public.design_tokens
   WHERE user_id = 'dd000001-0000-0000-0000-000000000003'::uuid
     AND type = 'use'
     AND work_id = 'work-expiry-test-001_use_paid_0'),
  'use 항목의 expires_at이 배치의 expires_at(1년 후)과 일치'
);

SELECT * FROM finish();
ROLLBACK;
