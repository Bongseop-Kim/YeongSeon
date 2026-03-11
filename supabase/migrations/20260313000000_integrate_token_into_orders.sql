-- =============================================================
-- integrate_token_into_orders
-- token_purchases 데이터를 orders/order_items 테이블로 통합
-- =============================================================

-- ── 1-1. orders 테이블 변경 ──────────────────────────────────

-- shipping_address_id nullable (token 주문은 배송 없음)
ALTER TABLE public.orders ALTER COLUMN shipping_address_id DROP NOT NULL;

-- order_type에 'token' 추가
ALTER TABLE public.orders DROP CONSTRAINT orders_order_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check
  CHECK (order_type = ANY (ARRAY['sale','custom','repair','token']));

-- status에 '실패' 추가
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    '대기중','결제중','진행중','배송중','배송완료','완료','취소','실패',
    '접수','제작중','제작완료','수선중','수선완료'
  ]));

-- payment_key 컬럼 추가 (Toss paymentKey 추적)
ALTER TABLE public.orders ADD COLUMN payment_key text;

-- ── 1-2. order_items 테이블 변경 ─────────────────────────────

-- item_type에 'token' 추가
ALTER TABLE public.order_items DROP CONSTRAINT order_items_item_type_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_item_type_check
  CHECK (item_type = ANY (ARRAY['product','reform','custom','token']));

-- item_type_content_check에 token 규칙 추가
ALTER TABLE public.order_items DROP CONSTRAINT order_items_item_type_content_check;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_item_type_content_check
  CHECK (
    (item_type = 'product' AND product_id IS NOT NULL)
    OR (item_type = 'reform' AND item_data IS NOT NULL)
    OR (item_type = 'custom' AND item_data IS NOT NULL)
    OR (item_type = 'token' AND item_data IS NOT NULL)
  );

-- ── 1-3. 기존 데이터 마이그레이션 ────────────────────────────

-- token_purchases → orders
-- order_number: 기존 UUID 앞 8자를 suffix로 사용하여 순번 생성기와 충돌 방지
INSERT INTO public.orders (
  id, user_id, order_number, shipping_address_id,
  total_price, original_price, total_discount,
  order_type, status, payment_group_id, payment_key,
  shipping_cost, created_at, updated_at
)
SELECT
  tp.id,
  tp.user_id,
  'TKN-' || to_char(tp.created_at, 'YYYYMMDD') || '-' || left(tp.id::text, 8),
  NULL,
  tp.price,
  tp.price,
  0,
  'token',
  tp.status,
  tp.payment_group_id,
  tp.payment_key,
  0,
  tp.created_at,
  tp.updated_at
FROM public.token_purchases tp;

-- token_purchases → order_items
INSERT INTO public.order_items (
  order_id, item_id, item_type, item_data, quantity, unit_price
)
SELECT
  tp.id,
  tp.plan_key,
  'token',
  jsonb_build_object('plan_key', tp.plan_key, 'token_amount', tp.token_amount),
  1,
  tp.price
FROM public.token_purchases tp;

-- ── 1-4. 기존 token 전용 RPC DROP ────────────────────────────
-- 새 쓰기는 create_token_order RPC로 대체됨
-- token_purchases 테이블은 이 마이그레이션에서 DROP하지 않음
-- 검증 완료 후 별도 마이그레이션에서 제거 예정

DROP FUNCTION IF EXISTS public.create_token_purchase(text);
DROP FUNCTION IF EXISTS public.lock_token_payment(uuid, uuid);
DROP FUNCTION IF EXISTS public.confirm_token_payment(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.unlock_token_payment(uuid, uuid);
