-- =============================================================
-- use_design_tokens_test.sql  –  use_design_tokens RPC 테스트
-- 커버 범위:
--   - 유료 토큰 차감 (paid 먼저)
--   - 잔액 부족 시 success=false 반환
--   - work_id 기반 멱등성
--   - 파라미터 검증 (invalid ai_model, request_type)
-- =============================================================

BEGIN;
SELECT plan(20);

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

  -- admin_settings: openai 분석/렌더 비용 = 5
  PERFORM test_helpers.ensure_admin_setting('design_token_cost_openai_analysis', '5');
  PERFORM test_helpers.ensure_admin_setting('design_token_cost_openai_render_standard', '5');
  PERFORM test_helpers.ensure_admin_setting('design_token_cost_openai_render_high', '5');
END $setup$;

-- service_role 컨텍스트 설정 (트랜잭션 내내 유지, 소유권 검증 우회)
SELECT test_helpers.set_service_role();

-- ── 테스트 1a: ai_generation_logs 접근 권한 확인 ─────────────
SELECT ok(
  has_table_privilege('authenticated', 'public.ai_generation_logs', 'SELECT'),
  'authenticated는 ai_generation_logs SELECT 권한을 가진다'
);

SELECT ok(
  has_table_privilege('service_role', 'public.ai_generation_logs', 'INSERT'),
  'service_role는 ai_generation_logs INSERT 권한을 가진다'
);

-- ── 테스트 1: 정상 차감 - 예외 없이 실행 ───────────────────
SELECT lives_ok(
  $$
    SELECT public.use_design_tokens(
      'dd000001-0000-0000-0000-000000000001'::uuid,
      'openai',
      'analysis',
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
    'openai', 'render_standard', 'standard', 'work-test-0002'
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
-- work-test-0001은 테스트1에서 이미 처리됨 → 원래 비용(cost=5) 유지
SELECT is(
  (SELECT (public.use_design_tokens(
    'dd000001-0000-0000-0000-000000000001'::uuid,
    'openai', 'analysis', 'standard', 'work-test-0001'
  ))->>'cost'),
  '5',
  '이미 처리된 work_id 재호출 시 원래 cost를 반환한다 (멱등성)'
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

-- ── 테스트 6: unauthorized caller → ownership failure ────────
SELECT test_helpers.set_auth('dd000001-0000-0000-0000-000000000002'::uuid);

SELECT throws_ok(
  $$
    SELECT public.use_design_tokens(
      'dd000001-0000-0000-0000-000000000001'::uuid,
      'openai',
      'analysis',
      'standard',
      'work-unauthorized-0001'
    )
  $$,
  'P0001', NULL,
  '비 service_role 호출자가 다른 사용자 토큰을 사용하려 하면 예외 발생'
);

SELECT test_helpers.set_service_role();

-- ── 테스트 7: 잔액 부족 - error=insufficient_tokens ─────────
-- user_b는 토큰 없음
SELECT is(
  (SELECT (public.use_design_tokens(
    'dd000001-0000-0000-0000-000000000002'::uuid,
    'openai', 'analysis'
  ))->>'error'),
  'insufficient_tokens',
  '잔액 부족 시 error=insufficient_tokens 반환'
);

-- ── 테스트 8: 잔액 부족 - success=false ─────────────────────
SELECT is(
  (SELECT (public.use_design_tokens(
    'dd000001-0000-0000-0000-000000000002'::uuid,
    'openai', 'render_high', 'high'
  ))->>'success'),
  'false',
  '잔액 부족 시 success=false 반환'
);

-- ── 테스트 9: 유효하지 않은 ai_model → 예외 ─────────────────
SELECT throws_ok(
  $$
    SELECT public.use_design_tokens(
      'dd000001-0000-0000-0000-000000000001'::uuid,
      'invalid_model',
      'analysis'
    )
  $$,
  'P0001', NULL,
  '유효하지 않은 ai_model 파라미터로 호출 시 예외 발생'
);

-- ── 테스트 10: 유효하지 않은 request_type → 예외 ─────────────
SELECT throws_ok(
  $$
    SELECT public.use_design_tokens(
      'dd000001-0000-0000-0000-000000000001'::uuid,
      'openai',
      'text_only'
    )
  $$,
  'P0001', NULL,
  '유효하지 않은 request_type 파라미터로 호출 시 예외 발생'
);

-- ── 테스트 11: non-service_role refund_design_tokens 거부 ──────
SELECT test_helpers.set_auth('dd000001-0000-0000-0000-000000000001'::uuid);

SELECT throws_ok(
  $$
    SELECT public.refund_design_tokens(
      'dd000001-0000-0000-0000-000000000001'::uuid,
      5,
      'openai',
      'analysis',
      'refund-unauthorized-0001'
    )
  $$,
  'P0001', NULL,
  'service_role이 아니면 refund_design_tokens가 거부된다'
);

SELECT test_helpers.set_service_role();

-- ── 테스트 픽스처: 만료 테스트용 사용자 + 주문 + 토큰 설정 ──────────────
DO $expiry_setup$
DECLARE
  v_user_c  uuid := 'dd000001-0000-0000-0000-000000000003';
  v_order_1 uuid := 'eeeeeeee-0000-0000-0000-000000000001';
  v_order_2 uuid := 'eeeeeeee-0000-0000-0000-000000000002';
  v_user_e  uuid := 'dd000001-0000-0000-0000-000000000005';
  v_order_e uuid := 'eeeeeeee-0000-0000-0000-000000000005';
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

  PERFORM test_helpers.create_test_user(v_user_e);

  INSERT INTO public.orders (
    id, user_id, order_number, shipping_address_id,
    total_price, original_price, total_discount,
    order_type, status, payment_group_id, shipping_cost
  ) VALUES (
    v_order_e, v_user_e, 'TKN-LEG-001', NULL,
    2900, 2900, 0, 'token', '완료', gen_random_uuid(), 0
  );

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, source_order_id, expires_at, description, work_id
  ) VALUES (
    v_user_e, 20, 'purchase', 'paid',
    v_order_e, NULL,
    '만료일 없는 유상 토큰(레거시)', 'legacy-null-expiry-token'
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
    'openai', 'analysis'
  ))->>'error'),
  'insufficient_tokens',
  '만료 토큰만 있는 사용자: use_design_tokens → insufficient_tokens'
);

-- ── 테스트 12: 유효 배치에서 FIFO 소비 → source_order_id 기록 확인 ─────────
SELECT lives_ok(
  $$
    SELECT public.use_design_tokens(
      'dd000001-0000-0000-0000-000000000003'::uuid,
      'openai', 'render_standard', 'standard', 'work-expiry-test-001'
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

-- ── 테스트 15: source_order_id가 있는 expires_at NULL paid 토큰도 차감 가능 ──
SELECT is(
  (SELECT (public.use_design_tokens(
    'dd000001-0000-0000-0000-000000000005'::uuid,
    'openai', 'render_high', 'high', 'work-legacy-null-expiry-001'
  ))->>'success'),
  'true',
  'source_order_id가 있고 expires_at이 NULL인 paid 토큰도 use_design_tokens가 사용한다'
);

-- ── 테스트 16: 위 차감 후 잔액이 감소함 ─────────────────────────────────
SELECT is(
  (SELECT COALESCE(SUM(amount), 0)::int
   FROM public.design_tokens
   WHERE user_id = 'dd000001-0000-0000-0000-000000000005'::uuid),
  15,
  'expires_at이 NULL인 paid 토큰 차감 후 총 잔액이 감소한다'
);

SELECT * FROM finish();
ROLLBACK;
