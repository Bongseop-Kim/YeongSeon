-- =============================================================
-- rls_policies_test.sql  –  RLS 정책 구조 및 역할 차단 검증
-- 커버 범위:
--   - policies_are(): 핵심 테이블의 정책 목록이 의도한 집합과 일치하는지 검증
--   - anon 역할 차단: SET LOCAL ROLE anon 후 데이터 접근 불가 확인
--   - authenticated 자기 데이터만 접근: 타 사용자 데이터 차단 확인
-- =============================================================

BEGIN;
SELECT plan(24);

-- ── 픽스처 ───────────────────────────────────────────────────
DO $setup$
DECLARE
  v_user_a uuid := 'aa000001-0000-0000-0000-000000000001';
  v_user_b uuid := 'aa000001-0000-0000-0000-000000000002';
BEGIN
  PERFORM test_helpers.create_test_user(v_user_a);
  PERFORM test_helpers.create_test_user(v_user_b);
  PERFORM test_helpers.create_test_profile(v_user_a, 'customer', '테스트 사용자 A');
  PERFORM test_helpers.create_test_profile(v_user_b, 'customer', '테스트 사용자 B');

  INSERT INTO public.products (
    id, code, name, price, image, category, color, pattern, material, info
  ) VALUES (
    999001, 'RLS-TEST-001', 'RLS 테스트 상품', 10000, 'https://example.com/test-product.jpg',
    '3fold', 'navy', 'solid', 'silk', 'RLS 테스트용 상품'
  )
  ON CONFLICT (id) DO NOTHING;

  -- user_a 카트 아이템 (product 타입)
  INSERT INTO public.cart_items
    (user_id, item_id, item_type, product_id, quantity)
  VALUES
    (v_user_a, 'item-a-001', 'product', 999001, 1);

  -- user_b 카트 아이템
  INSERT INTO public.cart_items
    (user_id, item_id, item_type, product_id, quantity)
  VALUES
    (v_user_b, 'item-b-001', 'product', 999001, 1);

  INSERT INTO public.product_likes (user_id, product_id)
  VALUES
    (v_user_a, 999001),
    (v_user_b, 999001);

  PERFORM test_helpers.create_sale_order(v_user_a, '대기중', 'ab000001-0000-0000-0000-000000000101');
  PERFORM test_helpers.create_sale_order(v_user_b, '대기중', 'ac000001-0000-0000-0000-000000000102');
END $setup$;

-- ── 1. cart_items 정책 목록 검증 ─────────────────────────────
SELECT policies_are(
  'public',
  'cart_items',
  ARRAY[
    'Users can view their own cart items',
    'Users can insert their own cart items',
    'Users can update their own cart items',
    'Users can delete their own cart items'
  ],
  'cart_items 정책 목록이 의도한 4개와 일치해야 함'
);

-- ── 2. product_likes 정책 목록 검증 ─────────────────────────
SELECT policies_are(
  'public',
  'product_likes',
  ARRAY[
    'Users can view their own likes',
    'Users can insert their own likes',
    'Users can delete their own likes'
  ],
  'product_likes 정책 목록이 의도한 3개와 일치해야 함'
);

-- ── 3. orders 정책 목록 검증 ────────────────────────────────
SELECT policies_are(
  'public',
  'orders',
  ARRAY[
    'Users can view their own orders',
    'Users can create their own orders',
    'Admins can view all orders',
    'Admins can update order status'
  ],
  'orders 정책 목록이 의도한 4개와 일치해야 함'
);

-- ── 4. profiles 정책 목록 검증 ──────────────────────────────
SELECT policies_are(
  'public',
  'profiles',
  ARRAY[
    'Users can view their own profile',
    'Users can insert their own profile',
    'Users can update their own profile',
    'Admins can view all profiles',
    'Admins can update profiles'
  ],
  'profiles 정책 목록이 의도한 5개와 일치해야 함'
);

-- ── 5–8. anon 역할 차단 검증 ────────────────────────────────
-- anon 역할로 전환하면 TO authenticated 정책은 적용되지 않으므로
-- RLS가 활성화된 테이블에서 모든 행이 차단된다.

SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" TO '{"role":"anon"}';

SELECT is(
  (SELECT COUNT(*)::int FROM public.cart_items),
  0,
  'anon 역할: cart_items 행 접근 불가'
);

SELECT is(
  (SELECT COUNT(*)::int FROM public.product_likes),
  0,
  'anon 역할: product_likes 행 접근 불가'
);

SELECT is(
  (SELECT COUNT(*)::int FROM public.orders),
  0,
  'anon 역할: orders 행 접근 불가'
);

SELECT is(
  (SELECT COUNT(*)::int FROM public.profiles),
  0,
  'anon 역할: profiles 행 접근 불가'
);

-- superuser로 복귀
RESET ROLE;

-- ── 9–12. authenticated 자기 데이터만 접근 검증 ──────────────
-- user_a로 인증 → user_a 아이템만 보이고 user_b 아이템은 안 보여야 함

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims"
  TO '{"sub":"aa000001-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is((SELECT COUNT(*)::int FROM public.cart_items), 1, 'authenticated(user_a): 자기 cart_item 1개만 조회');
SELECT is((SELECT COUNT(*)::int FROM public.product_likes), 1, 'authenticated(user_a): 자기 product_like 1개만 조회');
SELECT is((SELECT COUNT(*)::int FROM public.orders), 1, 'authenticated(user_a): 자기 order 1개만 조회');
SELECT is((SELECT COUNT(*)::int FROM public.profiles), 1, 'authenticated(user_a): 자기 profile 1개만 조회');

RESET ROLE;

-- user_b로 전환 → user_b 아이템만 보여야 함
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims"
  TO '{"sub":"aa000001-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is((SELECT COUNT(*)::int FROM public.cart_items), 1, 'authenticated(user_b): 자기 cart_item 1개만 조회');
SELECT is((SELECT COUNT(*)::int FROM public.product_likes), 1, 'authenticated(user_b): 자기 product_like 1개만 조회');
SELECT is((SELECT COUNT(*)::int FROM public.orders), 1, 'authenticated(user_b): 자기 order 1개만 조회');
SELECT is((SELECT COUNT(*)::int FROM public.profiles), 1, 'authenticated(user_b): 자기 profile 1개만 조회');

RESET ROLE;

-- ── 13. coupons 정책 목록 검증 ──────────────────────────────────
SELECT policies_are(
  'public',
  'coupons',
  ARRAY[
    'Allow read access to coupons',
    'service_role_select_coupons',
    'service_role_insert_coupons',
    'service_role_update_coupons',
    'service_role_delete_coupons',
    'Admins can insert coupons',
    'Admins can update coupons',
    'Admins can delete coupons'
  ],
  'coupons 정책 목록이 의도한 8개와 일치해야 함'
);

-- ── 14. user_coupons 정책 목록 검증 ──────────────────────────────
SELECT policies_are(
  'public',
  'user_coupons',
  ARRAY[
    'user_coupons_select_own',
    'service_role_select_user_coupons',
    'service_role_insert_user_coupons',
    'service_role_update_user_coupons',
    'service_role_delete_user_coupons',
    'Admins can view all user coupons',
    'Admins can insert user coupons',
    'Admins can update user coupons'
  ],
  'user_coupons 정책 목록이 의도한 8개와 일치해야 함'
);

-- ── 15. inquiries 정책 목록 검증 ──────────────────────────────
SELECT policies_are(
  'public',
  'inquiries',
  ARRAY[
    'Users can view their own inquiries',
    'Users can create their own inquiries',
    'Users can update their own pending inquiries',
    'Users can delete their own pending inquiries',
    'Admins can view all inquiries',
    'Admins can answer inquiries',
    'service_role_select_inquiries',
    'service_role_insert_inquiries',
    'service_role_update_inquiries',
    'service_role_delete_inquiries'
  ],
  'inquiries 정책 목록이 의도한 10개와 일치해야 함'
);

-- ── 16. order_items 정책 목록 검증 ─────────────────────────────
SELECT policies_are(
  'public',
  'order_items',
  ARRAY[
    'Users can view their own order items',
    'Users can create their own order items',
    'Admins can view all order items'
  ],
  'order_items 정책 목록이 의도한 3개와 일치해야 함'
);

-- ── 17. order_status_logs 정책 목록 검증 ────────────────────────
SELECT policies_are(
  'public',
  'order_status_logs',
  ARRAY[
    'Users can view logs of their own orders',
    'Admins can view all order status logs'
  ],
  'order_status_logs 정책 목록이 의도한 2개와 일치해야 함'
);

-- ── 18. claim_status_logs 정책 목록 검증 ────────────────────────
SELECT policies_are(
  'public',
  'claim_status_logs',
  ARRAY[
    'Users can view logs of their own claims',
    'Admins can view all claim status logs'
  ],
  'claim_status_logs 정책 목록이 의도한 2개와 일치해야 함'
);

-- ── 19. claims 정책 목록 검증 ────────────────────────────────────
SELECT policies_are(
  'public',
  'claims',
  ARRAY[
    'Users can view their own claims',
    'Users can create their own claims',
    'Admins can view all claims',
    'Admins can update claim status'
  ],
  'claims 정책 목록이 의도한 4개와 일치해야 함'
);

-- ── 20. shipping_addresses 정책 목록 검증 ───────────────────────
SELECT policies_are(
  'public',
  'shipping_addresses',
  ARRAY[
    'Enable users to view their own data only',
    'Enable insert for users based on user_id',
    'Enable update for users based on user_id',
    'Enable delete for users based on user_id',
    'Admins can view all shipping addresses'
  ],
  'shipping_addresses 정책 목록이 의도한 5개와 일치해야 함'
);

SELECT * FROM finish();
ROLLBACK;
