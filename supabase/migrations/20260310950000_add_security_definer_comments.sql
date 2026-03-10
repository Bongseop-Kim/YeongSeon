-- SECURITY DEFINER 사용 이유 문서화
-- create_order_txn: 재고 차감(stock UPDATE)과 결제 그룹 생성 시 다수 테이블에 걸쳐
-- INSERT/UPDATE를 수행한다. RLS 정책이 order 소유자 기준으로만 허용하므로 트랜잭션 내
-- 원자적 쓰기를 보장하기 위해 SECURITY DEFINER가 필요하다. auth.uid() 소유권 검증은
-- 함수 내부에서 v_user_id 확인 및 shipping_addresses 소유권 검사로 수행한다.
COMMENT ON FUNCTION public.create_order_txn(uuid, jsonb) IS
  'SECURITY DEFINER: 재고 차감(stock UPDATE)과 결제 그룹 INSERT가 다수 테이블에 걸쳐 수행됨. RLS 정책이 order 소유자 기준으로만 허용하므로 원자적 쓰기를 위해 SECURITY DEFINER 필요. auth.uid() 소유권 검증은 함수 내부에서 수행.';

-- create_custom_order_txn: 주문제작 주문 생성 시 order_items에 item_data(JSONB) 포함
-- INSERT를 수행한다. RLS가 주문 소유자 기준으로 설정되어 있어 신규 order 생성 직후
-- 동일 트랜잭션 내 order_items INSERT가 INVOKER 권한으로는 차단될 수 있다.
-- auth.uid() 소유권 검증은 함수 내부에서 수행한다.
COMMENT ON FUNCTION public.create_custom_order_txn(uuid, jsonb, integer, jsonb, text, boolean, text) IS
  'SECURITY DEFINER: 주문제작 주문 생성 시 order_items에 item_data(JSONB) 포함 INSERT 수행. RLS가 주문 소유자 기준으로 설정되어 있어 신규 order 직후 동일 트랜잭션 내 order_items INSERT가 INVOKER 권한으로 차단될 수 있음. auth.uid() 소유권 검증은 함수 내부에서 수행.';
