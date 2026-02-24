# Supabase 쓰기 경계

최종 수정: 2026-02-02

## 목표

주문과 장바구니에 대한 명확한 쓰기 경계 정의:

- 클라이언트가 쓰기 RPC를 직접 호출하지 않는다.
- 쓰기 사용 사례에서는 클라이언트가 Edge Function을 호출한다.
- Edge에서 입력 검증과 비즈니스 사전 조건을 확인한다.
- RPC가 트랜잭션 DB 쓰기를 수행한다.

## 현재 쓰기 경로

## 주문 생성

1. 클라이언트가 `src/features/order/api/order-api.ts`에서 `create-order` Edge Function 호출.
2. Edge가 `Authorization` 헤더로 사용자 인증.
3. Edge가 요청 형식 검증만 수행.
4. Edge가 `public.create_order_txn(p_shipping_address_id, p_items)` 호출.
5. RPC가 트랜잭션 내에서 쿠폰 재검증, 서버 측 합계/할인 계산, `orders`, `order_items` 쓰기, `user_coupons` 소비.

## 장바구니 교체

1. 클라이언트가 `public.replace_cart_items(p_user_id, p_items)` 호출.
2. RPC가 `p_user_id = auth.uid()` 확인 후 하나의 트랜잭션으로 장바구니 행 교체.

## 책임 분리

- Edge Function (`supabase/functions/create-order/index.ts`)
  - 요청 스키마 검증
  - 인증 확인
  - 배송지 소유권 사전 확인 (빠른 실패)
- 쓰기 RPC (`create_order_txn`, `replace_cart_items`)
  - 원자적 쓰기 및 무결성
  - 소유권 확인 (`auth.uid()`)
  - 쿠폰 잠금/재검증 및 금액 계산
  - 최종 영속화

## 보안 참고

- `create-order` Edge는 `verify_jwt = true`로 배포.
- `create_order_txn`과 `replace_cart_items`는 `SECURITY DEFINER`.
- 두 쓰기 RPC 모두 현재 DB 권한에서 `authenticated`가 실행 가능.

## 필수 규칙 (팀)

1. 새로운 쓰기 흐름은 반드시 `클라이언트 → Edge → RPC` 경로를 따른다.
2. 기능 코드에서 새로운 쓰기 RPC를 직접 클라이언트 호출하지 않는다.
3. 쓰기 RPC는 보안 모드(`DEFINER` 또는 `INVOKER`)를 명시적으로 선언해야 한다.
4. 개인화된 쓰기 RPC는 `auth.uid()` 소유권 검증을 강제해야 한다.
5. 금액 관련 값은 서버 측에서만 계산한다.

## 새 쓰기 흐름 체크리스트

- [ ] Edge 엔드포인트가 존재하고 유일한 클라이언트 진입점이다.
- [ ] `verify_jwt`가 활성화되어 있다.
- [ ] Edge가 페이로드와 사전 조건을 검증한다.
- [ ] RPC가 트랜잭션 쓰기를 수행한다.
- [ ] RPC가 소유권을 확인한다 (`auth.uid()`).
- [ ] 마이그레이션에 명시적 권한 부여/해제가 포함되어 있다.
- [ ] 비인가, 잘못된 페이로드, 정상 경로 테스트를 커버한다.
