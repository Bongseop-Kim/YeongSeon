# Supabase 쓰기 보안 감사 (2026-02-02)

## 범위

- 쓰기 RPC: `create_order_txn`, `replace_cart_items`
- 관련 읽기/쓰기 RPC: `get_cart_items`
- 관련 테이블/정책: `orders`, `order_items`, `cart_items`, `user_coupons`, `shipping_addresses`
- Edge Function: `create-order`

## 스냅샷

- `create-order` Edge: `verify_jwt = true` (배포됨)
- `create_order_txn`: `SECURITY DEFINER`, `authenticated`가 실행 가능
- `replace_cart_items`: `SECURITY DEFINER`, `authenticated`가 실행 가능
- `get_cart_items`: `SECURITY INVOKER`, `authenticated`가 실행 가능

## RLS/정책 확인

다음 테이블에서 사용자 소유권을 강제하는 정책 확인:

- `orders`: `auth.uid() = user_id`로 insert/select
- `order_items`: 소유한 `orders` 행을 통한 select/insert
- `cart_items`: 자신의 `user_id`로 select/insert/update/delete
- `shipping_addresses`: 자신의 `user_id`로 select/insert/update/delete
- `user_coupons`: 자신의 select + service role 전체

## 발견 사항

## F-01 (중간): 쓰기 RPC가 `authenticated`에 실행 가능

`create_order_txn`과 `replace_cart_items`를 인증된 클라이언트가 직접 호출 가능.

위험:

- 의도된 Edge 전용 경계를 우회.
- 대체 클라이언트가 쓰기 RPC 계약을 직접 접근 가능.

현재 완화 조치:

- `replace_cart_items`는 `p_user_id` 소유권 검증 보유.
- `create_order_txn`은 auth + 배송지 소유권 + 아이템 타입 검증.

권고:

- 하위 호환성이 필요하면 현재 상태 유지.
- 엄격한 경계가 필요하면 service-role 매개 쓰기 경로로 전환하거나 RPC 수준 남용 방지 제약 및 강화된 권한 추가.

## F-02 (해결됨): 금액 계산이 RPC로 이전

강화 마이그레이션으로 `create_order_txn`을 다음과 같이 변경:

- `p_shipping_address_id`, `p_items`만 수신
- DB 트랜잭션 내에서 `unit_price`, `discount_amount`, 합계 계산
- `FOR UPDATE`로 `user_coupons` 행 잠금/재검증

잔여 위험:

- 설계상 인증된 사용자의 쓰기 RPC 직접 호출이 여전히 가능.
- 경계는 팀 규칙과 권한 모델에 의존.

## F-03 (낮음): 레거시 `order_items_view` 린터 이슈

Advisor가 `public.order_items_view`에 대해 `security_definer_view` 보고.

위험:

- 레거시 뷰가 사용될 경우 혼동/오용 가능성.

권고:

- 폐기 후 최종적으로 제거하거나 invoker 안전 뷰 전략(`order_item_view`)으로 교체.

## 결정

- 이번 단계에서는 즉시 권한/정책 마이그레이션 없음.
- 경계와 규칙은 ADR로 문서화 및 고정.
- 보안 강화 작업은 후속 백로그 항목으로 유지.
