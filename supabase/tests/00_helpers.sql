-- =============================================================
-- 00_helpers.sql  –  pgTAP 공통 헬퍼 (테스트 없음, 함수 정의만)
-- supabase test db가 tests/*.sql을 알파벳 순으로 실행하므로
-- 이 파일이 가장 먼저 실행됨. COMMIT으로 헬퍼를 이후 테스트에서 사용 가능.
-- =============================================================

BEGIN;
SELECT plan(1);  -- 헬퍼 스키마 생성 smoke test

-- ── 스키마 ──────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS test_helpers;

-- ── 인증 컨텍스트 ───────────────────────────────────────────

-- set_auth: 특정 사용자의 인증 컨텍스트 설정
-- auth.uid()가 p_user_id를 반환하게 만든다
CREATE OR REPLACE FUNCTION test_helpers.set_auth(
  p_user_id uuid,
  p_role    text DEFAULT 'authenticated'
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object(
      'sub',  p_user_id::text,
      'role', p_role,
      'iss',  'supabase'
    )::text,
    true  -- is_local: 트랜잭션 종료 시 초기화
  );
END;
$$;

-- set_service_role: service_role 컨텍스트 설정 (소유권 검증 우회)
CREATE OR REPLACE FUNCTION test_helpers.set_service_role()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"role": "service_role"}',
    true
  );
END;
$$;

-- clear_auth: 인증 컨텍스트 초기화 (auth.uid() → NULL)
CREATE OR REPLACE FUNCTION test_helpers.clear_auth()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$$;

-- ── 사용자 픽스처 ──────────────────────────────────────────

-- create_test_user: auth.users에 테스트 사용자 생성
-- pgTAP 테스트는 superuser 권한으로 실행되므로 auth.users 직접 INSERT 가능
CREATE OR REPLACE FUNCTION test_helpers.create_test_user(
  p_user_id uuid,
  p_email   text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    p_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    COALESCE(p_email, 'test_' || replace(p_user_id::text, '-', '') || '@example.com'),
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '', '', '', ''
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN p_user_id;
END;
$$;

-- create_test_profile: profiles 테이블에 프로필 생성 (초기 토큰 지급 트리거 발동)
-- p_role: 'customer' | 'admin' | 'manager'
CREATE OR REPLACE FUNCTION test_helpers.create_test_profile(
  p_user_id uuid,
  p_role    text DEFAULT 'customer',
  p_name    text DEFAULT '테스트 사용자'
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (p_user_id, p_name, p_role::public.user_role)
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role,
        name = EXCLUDED.name;
END;
$$;

-- ── 주문 픽스처 ────────────────────────────────────────────

-- create_token_order: 토큰 주문 + order_item 생성
-- 반환: TABLE(order_id uuid, payment_group_id uuid)
CREATE OR REPLACE FUNCTION test_helpers.create_token_order(
  p_user_id      uuid,
  p_status       text    DEFAULT '결제중',
  p_token_amount integer DEFAULT 50,
  p_plan_key     text    DEFAULT 'starter',
  p_payment_key  text    DEFAULT NULL,
  p_order_id     uuid    DEFAULT NULL,
  p_group_id     uuid    DEFAULT NULL
) RETURNS TABLE (order_id uuid, payment_group_id uuid) LANGUAGE plpgsql AS $$
DECLARE
  v_order_id uuid := COALESCE(p_order_id, gen_random_uuid());
  v_group_id uuid := COALESCE(p_group_id, gen_random_uuid());
BEGIN
  INSERT INTO public.orders (
    id, user_id, order_number, total_price, original_price,
    order_type, status, payment_group_id, shipping_cost, payment_key
  ) VALUES (
    v_order_id, p_user_id,
    'TST-' || substr(v_order_id::text, 1, 8),
    10000, 10000,
    'token', p_status, v_group_id, 0, p_payment_key
  );

  INSERT INTO public.order_items (
    order_id, item_id, item_type, item_data, quantity, unit_price
  ) VALUES (
    v_order_id, p_plan_key, 'token',
    jsonb_build_object(
      'plan_key',     p_plan_key,
      'token_amount', p_token_amount
    ),
    1, 10000
  );

  order_id       := v_order_id;
  payment_group_id := v_group_id;
  RETURN NEXT;
END;
$$;

-- create_sale_order: 일반 판매 주문 생성
CREATE OR REPLACE FUNCTION test_helpers.create_sale_order(
  p_user_id     uuid,
  p_status      text DEFAULT '대기중',
  p_order_id    uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_order_id uuid := COALESCE(p_order_id, gen_random_uuid());
  v_addr_id  uuid;
BEGIN
  -- shipping_address_required constraint: non-token orders need address
  INSERT INTO public.shipping_addresses (
    user_id, recipient_name, recipient_phone, address, address_detail,
    postal_code, is_default
  ) VALUES (
    p_user_id, '테스트 수령인', '010-0000-0000',
    '서울시 강남구', '테스트로 1', '12345', false
  )
  RETURNING id INTO v_addr_id;

  INSERT INTO public.orders (
    id, user_id, order_number, total_price, original_price,
    order_type, status, shipping_cost, shipping_address_id
  ) VALUES (
    v_order_id, p_user_id,
    'TST-' || substr(v_order_id::text, 1, 8),
    20000, 20000,
    'sale', p_status, 3000, v_addr_id
  );

  RETURN v_order_id;
END;
$$;

-- create_custom_order: 맞춤 주문 생성
CREATE OR REPLACE FUNCTION test_helpers.create_custom_order(
  p_user_id  uuid,
  p_status   text DEFAULT '제작중',
  p_order_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_order_id uuid := COALESCE(p_order_id, gen_random_uuid());
  v_addr_id  uuid;
BEGIN
  INSERT INTO public.shipping_addresses (
    user_id, recipient_name, recipient_phone, address, address_detail,
    postal_code, is_default
  ) VALUES (
    p_user_id, '테스트 수령인', '010-0000-0000',
    '서울시 강남구', '테스트로 1', '12345', false
  )
  RETURNING id INTO v_addr_id;

  INSERT INTO public.orders (
    id, user_id, order_number, total_price, original_price,
    order_type, status, shipping_cost, shipping_address_id
  ) VALUES (
    v_order_id, p_user_id,
    'TST-' || substr(v_order_id::text, 1, 8),
    50000, 50000,
    'custom', p_status, 0, v_addr_id
  );

  RETURN v_order_id;
END;
$$;

-- ── admin_settings 헬퍼 ────────────────────────────────────

-- ensure_admin_setting: admin_settings에 테스트용 설정 삽입 (없으면 생성, 있으면 값 갱신)
CREATE OR REPLACE FUNCTION test_helpers.ensure_admin_setting(
  p_key   text,
  p_value text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.admin_settings (key, value)
  VALUES (p_key, p_value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END;
$$;

SELECT pass('test_helpers 스키마 및 헬퍼 함수 정의 완료');

SELECT * FROM finish();
COMMIT;  -- ROLLBACK이 아닌 COMMIT: 이후 테스트 파일에서 test_helpers.* 사용 가능
