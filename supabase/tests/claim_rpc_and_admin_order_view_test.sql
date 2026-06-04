-- =============================================================
-- claim_rpc_and_admin_order_view_test.sql
-- 커버 범위:
--   - create_claim은 SECURITY INVOKER여야 한다
--   - admin_update_claim_status는 주문 내 다른 활성 클레임 존재 시
--     raw unique_violation 대신 도메인 예외를 반환해야 한다
--   - admin_order_detail_view는 createdAt/updatedAt camelCase 컬럼을 노출해야 한다
-- =============================================================

BEGIN;
SELECT plan(7);

-- ── 테스트 1: create_claim security context ──────────────────
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_claim'
      AND pg_get_function_identity_arguments(p.oid)
        = 'p_type text, p_order_id uuid, p_item_id text, p_reason text, p_description text, p_quantity integer'
      AND NOT p.prosecdef
  ),
  'create_claim은 SECURITY INVOKER여야 한다'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.orders', 'SELECT')
    AND has_table_privilege('authenticated', 'public.order_items', 'SELECT')
    AND has_table_privilege('authenticated', 'public.claims', 'SELECT')
    AND has_table_privilege('authenticated', 'public.claims', 'INSERT'),
  'authenticated는 create_claim SECURITY INVOKER 실행에 필요한 최소 테이블 권한을 가진다'
);

DO $setup_claim_invoker$
DECLARE
  v_user uuid := 'c1000001-0000-0000-0000-000000000012';
  v_order_id uuid := 'c1000001-0000-0000-0000-000000000013';
  v_addr_id uuid;
BEGIN
  PERFORM test_helpers.create_test_user(v_user);
  PERFORM test_helpers.create_test_profile(v_user, 'customer', '샘플 클레임 사용자');

  INSERT INTO public.shipping_addresses (
    user_id,
    recipient_name,
    recipient_phone,
    address,
    address_detail,
    postal_code,
    is_default
  ) VALUES (
    v_user,
    '샘플 수령인',
    '010-0000-0000',
    '서울시 강남구',
    '샘플로 1',
    '12345',
    false
  )
  RETURNING id INTO v_addr_id;

  INSERT INTO public.orders (
    id,
    user_id,
    order_number,
    shipping_address_id,
    total_price,
    original_price,
    order_type,
    status,
    shipping_cost
  ) VALUES (
    v_order_id,
    v_user,
    'TST-CLAIM-SAMPLE-001',
    v_addr_id,
    30000,
    30000,
    'sample',
    '접수',
    0
  );

  INSERT INTO public.order_items (
    order_id,
    item_id,
    item_type,
    item_data,
    quantity,
    unit_price
  ) VALUES (
    v_order_id,
    'sample-order-' || v_order_id::text,
    'sample',
    jsonb_build_object(
      'sample_type', 'fabric',
      'options', jsonb_build_object('design_type', 'PRINTING'),
      'pricing', jsonb_build_object('total_cost', 30000)
    ),
    1,
    30000
  );
END $setup_claim_invoker$;

SELECT test_helpers.set_auth(
  'c1000001-0000-0000-0000-000000000012'::uuid,
  'authenticated'
);

SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$
    SELECT public.create_claim(
      'cancel',
      'c1000001-0000-0000-0000-000000000013'::uuid,
      'sample-order-c1000001-0000-0000-0000-000000000013',
      'change_mind',
      NULL,
      1
    )
  $$,
  'authenticated 사용자는 sample 주문 취소 클레임을 create_claim RPC로 생성할 수 있다'
);

RESET ROLE;

-- ── 테스트 2-3: 비활성→활성 전이 시 사용자 친화적 예외 ──────────
DO $setup$
DECLARE
  v_admin uuid := 'c1000001-0000-0000-0000-000000000001';
  v_user uuid := 'c1000001-0000-0000-0000-000000000002';
  v_order_id uuid;
BEGIN
  PERFORM test_helpers.create_test_user(v_admin);
  PERFORM test_helpers.create_test_profile(v_admin, 'admin', '클레임 관리자');
  PERFORM test_helpers.create_test_user(v_user);
  PERFORM test_helpers.create_test_profile(v_user, 'customer', '클레임 사용자');

  v_order_id := test_helpers.create_sale_order(v_user, '배송완료');
  UPDATE public.orders
  SET order_number = 'TST-CLAIM-GUARD-001'
  WHERE id = v_order_id;

  INSERT INTO public.products (
    id,
    code,
    name,
    price,
    image,
    category,
    color,
    pattern,
    material,
    info
  )
  VALUES (
    999101,
    'CLAIM-GUARD-001',
    '클레임 가드 테스트 상품',
    10000,
    'https://example.com/claim-guard-product.jpg',
    '3fold',
    'navy',
    'solid',
    'silk',
    '활성 클레임 가드 테스트용 상품'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.order_items (
    order_id,
    item_id,
    item_type,
    product_id,
    quantity,
    unit_price
  )
  VALUES
    (v_order_id, 'claim-guard-item-1', 'product', 999101, 1, 10000),
    (v_order_id, 'claim-guard-item-2', 'product', 999101, 1, 10000);

  INSERT INTO public.claims (
    id,
    user_id,
    order_id,
    order_item_id,
    claim_number,
    type,
    reason,
    status,
    quantity
  )
  SELECT
    'c1000001-0000-0000-0000-000000000101'::uuid,
    v_user,
    v_order_id,
    oi.id,
    'CLM-GUARD-001',
    'return',
    'defect',
    '접수',
    1
  FROM public.order_items oi
  WHERE oi.order_id = v_order_id
    AND oi.item_id = 'claim-guard-item-1';

  INSERT INTO public.claims (
    id,
    user_id,
    order_id,
    order_item_id,
    claim_number,
    type,
    reason,
    status,
    quantity
  )
  SELECT
    'c1000001-0000-0000-0000-000000000102'::uuid,
    v_user,
    v_order_id,
    oi.id,
    'CLM-GUARD-002',
    'exchange',
    'wrong_item',
    '거부',
    1
  FROM public.order_items oi
  WHERE oi.order_id = v_order_id
    AND oi.item_id = 'claim-guard-item-2';
END $setup$;

SELECT test_helpers.set_auth(
  'c1000001-0000-0000-0000-000000000001'::uuid,
  'authenticated'
);

SELECT throws_ok(
  $$
    SELECT public.admin_update_claim_status(
      'c1000001-0000-0000-0000-000000000102'::uuid,
      '접수',
      '오거부 복원',
      true
    )
  $$,
  'P0001',
  'Active claim already exists for this order',
  '비활성 클레임을 활성화할 때 다른 활성 클레임이 있으면 도메인 예외를 반환한다'
);

SELECT is(
  (SELECT status
   FROM public.claims
   WHERE id = 'c1000001-0000-0000-0000-000000000102'::uuid),
  '거부',
  '도메인 예외 발생 시 대상 클레임 상태는 변경되지 않는다'
);

-- ── 테스트 4-5: admin_order_detail_view camelCase 컬럼 ─────────
SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_order_detail_view'
      AND column_name = 'createdAt'
  ),
  'admin_order_detail_view는 createdAt 컬럼을 노출해야 한다'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_order_detail_view'
      AND column_name = 'updatedAt'
  ),
  'admin_order_detail_view는 updatedAt 컬럼을 노출해야 한다'
);

SELECT * FROM finish();
ROLLBACK;
