-- =============================================================
-- token_refund_and_admin_balance_test.sql  –  환불/관리자 토큰 조회 회귀 테스트
-- 커버 범위:
--   - get_design_token_balances_admin가 만료 paid 토큰을 제외하는지
--   - get_refundable_token_orders가 canonical work_id(order_<id>)를 인식하는지
--   - approve_token_refund가 레거시 purchase ledger에도 source_order_id 추적을 남기는지
-- =============================================================

BEGIN;
SELECT plan(15);

DO $setup$
DECLARE
  v_admin_user      uuid := 'fa000001-0000-0000-0000-000000000001';
  v_balance_user    uuid := 'fa000001-0000-0000-0000-000000000002';
  v_balance_order_1 uuid := 'fa110001-0000-0000-0000-000000000001';
  v_balance_order_2 uuid := 'fb110001-0000-0000-0000-000000000002';
  v_balance_group_1 uuid := 'fa120001-0000-0000-0000-000000000001';
  v_balance_group_2 uuid := 'fa120001-0000-0000-0000-000000000002';
  v_refundable_user uuid := 'fa000001-0000-0000-0000-000000000004';
  v_refundable_order uuid := 'fc100001-0000-0000-0000-000000000001';
  v_refundable_group uuid := 'fc200001-0000-0000-0000-000000000001';
  v_refundable_legacy_user uuid := 'fa000001-0000-0000-0000-000000000005';
  v_refundable_legacy_order uuid := 'fc100002-0000-0000-0000-000000000001';
  v_refundable_legacy_group uuid := 'fc200001-0000-0000-0000-000000000002';
  v_refund_user     uuid := 'fa000001-0000-0000-0000-000000000003';
  v_refund_order    uuid := 'fa100001-0000-0000-0000-000000000001';
  v_refund_group    uuid := 'fa200001-0000-0000-0000-000000000001';
  v_refund_claim    uuid := 'fa300001-0000-0000-0000-000000000001';
  v_refund_item_id  uuid;
  v_refund_paid_user uuid := 'fa000001-0000-0000-0000-000000000006';
  v_refund_paid_order uuid := 'fa100002-0000-0000-0000-000000000001';
  v_refund_paid_group uuid := 'fa200001-0000-0000-0000-000000000002';
  v_refund_paid_claim uuid := 'fa300001-0000-0000-0000-000000000002';
  v_refund_paid_item_id uuid;
  v_expired_refund_user uuid := 'fa000001-0000-0000-0000-000000000007';
  v_expired_refund_order uuid := 'fa100003-0000-0000-0000-000000000001';
  v_expired_refund_group uuid := 'fa200001-0000-0000-0000-000000000003';
BEGIN
  PERFORM test_helpers.create_test_user(v_admin_user);
  PERFORM test_helpers.create_test_profile(v_admin_user, 'admin', '관리자');

  PERFORM test_helpers.create_test_user(v_balance_user);
  PERFORM test_helpers.create_test_profile(v_balance_user, 'customer', '잔액 사용자');

  DELETE FROM public.design_tokens
  WHERE user_id = v_balance_user
    AND type = 'grant'
    AND token_class = 'free'
    AND description = '신규 가입 토큰 지급';

  INSERT INTO public.pricing_constants (key, amount, category)
  VALUES
    ('token_plan_starter_price', 2900, 'token'),
    ('token_plan_starter_amount', 30, 'token'),
    ('token_plan_popular_price', 9900, 'token'),
    ('token_plan_popular_amount', 120, 'token'),
    ('token_plan_pro_price', 19900, 'token'),
    ('token_plan_pro_amount', 300, 'token')
  ON CONFLICT (key) DO UPDATE
  SET amount = EXCLUDED.amount,
      category = EXCLUDED.category;

  PERFORM test_helpers.create_token_order(
    v_balance_user, '완료', 50, 'starter', 'expired-balance-payment', v_balance_order_1, v_balance_group_1
  );
  PERFORM test_helpers.create_token_order(
    v_balance_user, '완료', 30, 'starter', 'active-balance-payment', v_balance_order_2, v_balance_group_2
  );

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, source_order_id, expires_at, description, work_id
  ) VALUES
    (
      v_balance_user, 50, 'purchase', 'paid',
      v_balance_order_1, now() - interval '1 day',
      '만료된 유상 토큰', 'expired-balance-token'
    ),
    (
      v_balance_user, 30, 'purchase', 'paid',
      v_balance_order_2, now() + interval '1 day',
      '유효한 유상 토큰', 'active-balance-token'
    ),
    (
      v_balance_user, 7, 'grant', 'bonus',
      NULL, NULL,
      '보너스 토큰', 'bonus-balance-token'
    ),
    (
      v_balance_user, 9, 'grant', 'free',
      NULL, now() - interval '1 day',
      '만료된 무료 토큰', 'expired-free-balance-token'
    );

  PERFORM test_helpers.create_test_user(v_refundable_user);
  PERFORM test_helpers.create_test_profile(v_refundable_user, 'customer', '환불 가능 사용자');

  PERFORM test_helpers.create_token_order(
    v_refundable_user, '완료', 40, 'starter', 'canonical-payment-key', v_refundable_order, v_refundable_group
  );

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, source_order_id, expires_at, description, work_id
  ) VALUES (
    v_refundable_user, 40, 'purchase', 'paid',
    v_refundable_order, now() + interval '1 year',
    'canonical 구매 토큰', 'order_' || v_refundable_order::text
  );

  PERFORM test_helpers.create_test_user(v_refundable_legacy_user);
  PERFORM test_helpers.create_test_profile(v_refundable_legacy_user, 'customer', '레거시 환불 가능 사용자');

  PERFORM test_helpers.create_token_order(
    v_refundable_legacy_user, '완료', 25, 'starter', 'legacy-paid-payment-key',
    v_refundable_legacy_order, v_refundable_legacy_group
  );

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, source_order_id, expires_at, description, work_id
  ) VALUES (
    v_refundable_legacy_user, 25, 'purchase', 'paid',
    NULL, now() + interval '1 year',
    'legacy _paid 구매 토큰', 'order_' || v_refundable_legacy_order::text || '_paid'
  );

  PERFORM test_helpers.create_test_user(v_refund_user);
  PERFORM test_helpers.create_test_profile(v_refund_user, 'customer', '환불 사용자');

  PERFORM test_helpers.create_token_order(
    v_refund_user, '완료', 40, 'starter', 'legacy-payment-key', v_refund_order, v_refund_group
  );

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, description, work_id
  ) VALUES (
    v_refund_user, 40, 'purchase', 'paid', '레거시 구매 토큰', 'legacy_purchase_token'
  );

  SELECT id
    INTO v_refund_item_id
    FROM public.order_items
   WHERE order_id = v_refund_order
     AND item_type = 'token'
   LIMIT 1;

  INSERT INTO public.claims (
    id, user_id, order_id, order_item_id,
    claim_number, type, status,
    reason, quantity, refund_data
  ) VALUES (
    v_refund_claim,
    v_refund_user,
    v_refund_order,
    v_refund_item_id,
    'TKR-TEST-LEGACY-0001',
    'token_refund',
    '접수',
    '레거시 환불 테스트',
    1,
    jsonb_build_object(
      'paid_token_amount', 40,
      'bonus_token_amount', 0,
      'refund_amount', 10000
    )
  );

  PERFORM test_helpers.create_test_user(v_refund_paid_user);
  PERFORM test_helpers.create_test_profile(v_refund_paid_user, 'customer', '레거시 _paid 환불 사용자');

  PERFORM test_helpers.create_token_order(
    v_refund_paid_user, '완료', 25, 'starter', 'legacy-paid-refund-key',
    v_refund_paid_order, v_refund_paid_group
  );

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, source_order_id, expires_at, description, work_id
  ) VALUES (
    v_refund_paid_user, 25, 'purchase', 'paid',
    NULL, now() + interval '1 year',
    '레거시 _paid 환불 구매 토큰', 'order_' || v_refund_paid_order::text || '_paid'
  );

  SELECT id
    INTO v_refund_paid_item_id
    FROM public.order_items
   WHERE order_id = v_refund_paid_order
     AND item_type = 'token'
   LIMIT 1;

  INSERT INTO public.claims (
    id, user_id, order_id, order_item_id,
    claim_number, type, status,
    reason, quantity, refund_data
  ) VALUES (
    v_refund_paid_claim,
    v_refund_paid_user,
    v_refund_paid_order,
    v_refund_paid_item_id,
    'TKR-TEST-LEGACY-0002',
    'token_refund',
    '접수',
    '레거시 _paid 환불 테스트',
    1,
    jsonb_build_object(
      'paid_token_amount', 25,
      'bonus_token_amount', 0,
      'refund_amount', 10000
    )
  );

  PERFORM test_helpers.create_test_user(v_expired_refund_user);
  PERFORM test_helpers.create_test_profile(v_expired_refund_user, 'customer', '만료 환불 사용자');

  PERFORM test_helpers.create_token_order(
    v_expired_refund_user, '완료', 15, 'starter', 'expired-refund-key',
    v_expired_refund_order, v_expired_refund_group
  );

  INSERT INTO public.design_tokens (
    user_id, amount, type, token_class, source_order_id, expires_at, description, work_id
  ) VALUES (
    v_expired_refund_user, 15, 'purchase', 'paid',
    v_expired_refund_order, now() - interval '1 hour',
    '만료된 환불 대상 토큰', 'order_' || v_expired_refund_order::text || '_paid'
  );
END $setup$;

SELECT test_helpers.set_auth('fa000001-0000-0000-0000-000000000001'::uuid);

SELECT test_helpers.set_auth('fa000001-0000-0000-0000-000000000002'::uuid);

SELECT is(
  ((public.get_design_token_balance())->>'total')::integer,
  37,
  'get_design_token_balance는 만료된 free 토큰을 total에서 제외한다'
);

SELECT is(
  ((public.get_design_token_balance())->>'paid')::integer,
  30,
  'get_design_token_balance는 유효한 paid 토큰만 paid 잔액으로 반환한다'
);

SELECT is(
  ((public.get_design_token_balance())->>'bonus')::integer,
  7,
  'get_design_token_balance는 만료되지 않은 bonus/free 토큰만 bonus 잔액으로 반환한다'
);

SELECT test_helpers.set_auth('fa000001-0000-0000-0000-000000000001'::uuid);

SELECT is(
  (
    SELECT balance
    FROM public.get_design_token_balances_admin(
      ARRAY['fa000001-0000-0000-0000-000000000002'::uuid]
    )
  ),
  37,
  'get_design_token_balances_admin는 만료된 paid 토큰을 제외하고 잔액을 집계한다'
);

SELECT test_helpers.set_auth('fa000001-0000-0000-0000-000000000004'::uuid);

SELECT is(
  (
    SELECT ((public.get_refundable_token_orders() -> 0) ->> 'paid_tokens_granted')::integer
  ),
  40,
  'get_refundable_token_orders는 canonical work_id(order_<id>) 기반 지급 토큰을 조회한다'
);

SELECT is(
  (
    SELECT (public.get_refundable_token_orders() -> 0) ->> 'not_refundable_reason'
  ),
  NULL,
  '최신 토큰 주문이고 사용 이력이 없으면 환불 불가 사유가 없다'
);

SELECT test_helpers.set_auth('fa000001-0000-0000-0000-000000000005'::uuid);

SELECT is(
  (
    SELECT ((public.get_refundable_token_orders() -> 0) ->> 'paid_tokens_granted')::integer
  ),
  25,
  'get_refundable_token_orders는 legacy work_id(order_<id>_paid) 기반 지급 토큰도 조회한다'
);

SELECT ok(
  (
    SELECT ((public.get_refundable_token_orders() -> 0) ->> 'token_expires_at') IS NOT NULL
  ),
  'get_refundable_token_orders는 legacy work_id(order_<id>_paid)의 만료일도 반환한다'
);

SELECT test_helpers.set_service_role();

SELECT lives_ok(
  $$
    SELECT public.approve_token_refund(
      'fa300001-0000-0000-0000-000000000001'::uuid,
      'fa000001-0000-0000-0000-000000000001'::uuid
    )
  $$,
  '레거시 purchase ledger가 있어도 approve_token_refund는 예외 없이 실행된다'
);

SELECT is(
  (
    SELECT source_order_id
    FROM public.design_tokens
    WHERE work_id = 'refund_fa300001-0000-0000-0000-000000000001_paid'
  ),
  'fa100001-0000-0000-0000-000000000001'::uuid,
  'approve_token_refund는 레거시 purchase ledger에도 환불 ledger의 source_order_id를 주문 ID로 남긴다'
);

SELECT lives_ok(
  $$
    SELECT public.approve_token_refund(
      'fa300001-0000-0000-0000-000000000002'::uuid,
      'fa000001-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'legacy work_id(order_<id>_paid) purchase ledger가 있어도 approve_token_refund는 예외 없이 실행된다'
);

SELECT ok(
  (
    SELECT refund_dt.expires_at = purchase_dt.expires_at
    FROM public.design_tokens AS refund_dt
    JOIN public.design_tokens AS purchase_dt
      ON purchase_dt.user_id = refund_dt.user_id
     AND purchase_dt.type = 'purchase'
     AND purchase_dt.work_id = 'order_fa100002-0000-0000-0000-000000000001_paid'
    WHERE refund_dt.work_id = 'refund_fa300001-0000-0000-0000-000000000002_paid'
  ),
  'approve_token_refund는 legacy work_id(order_<id>_paid) purchase ledger의 expires_at을 환불 ledger에 유지한다'
);

SELECT test_helpers.set_auth('fa000001-0000-0000-0000-000000000004'::uuid);

SELECT ok(
  jsonb_typeof(public.get_token_plans()) = 'array',
  'get_token_plans 함수가 마이그레이션 기준 DB에도 존재한다'
);

SELECT lives_ok(
  $$
    SELECT public.create_token_order('starter')
  $$,
  'create_token_order 함수가 마이그레이션 기준 DB에도 존재하고 호출 가능하다'
);

SELECT test_helpers.set_auth('fa000001-0000-0000-0000-000000000007'::uuid);

SELECT throws_ok(
  $$
    SELECT public.request_token_refund(
      'fa100003-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'P0001',
  'token_order_expired',
  'request_token_refund는 만료된 토큰 주문에 대해 기계 판독 가능한 오류 코드를 던진다'
);

SELECT * FROM finish();
ROLLBACK;
