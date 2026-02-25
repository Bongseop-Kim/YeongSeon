# Supabase 쓰기 경계

## 목표

현재 운영 중인 쓰기 경계를 명확히 정의:

- 쓰기 영속화는 기본적으로 RPC가 수행한다.
- 주문 생성은 Edge 진입점을 사용한다.
- 장바구니/클레임은 현재 클라이언트의 직접 RPC 호출을 허용한다.
- 장바구니 초기화는 현재 클라이언트의 직접 테이블 삭제(`cart_items`)를 예외적으로 허용한다.
- 어떤 경로든 소유권 검증/서버 계산/트랜잭션 무결성을 보장한다.

## 현재 쓰기 경로

## 주문 생성

1. 클라이언트가 `apps/store/src/features/order/api/order-api.ts`에서 `create-order` Edge Function 호출.
2. Edge가 `Authorization` 헤더로 사용자 인증.
3. Edge가 요청 형식 검증만 수행.
4. Edge가 `public.create_order_txn(p_shipping_address_id, p_items)` 호출.
5. RPC가 트랜잭션 내에서 쿠폰 재검증, 서버 측 합계/할인 계산, `orders`, `order_items` 쓰기, `user_coupons` 소비.

## 장바구니 교체

1. 클라이언트가 `public.replace_cart_items(p_user_id, p_items)` 호출.
2. RPC가 `p_user_id = auth.uid()` 확인 후 하나의 트랜잭션으로 장바구니 행 교체.

## 장바구니 초기화

1. 클라이언트가 `apps/store/src/features/cart/api/cart-api.ts`에서 `cart_items` 테이블에 `DELETE` 호출.
2. RLS(`auth.uid() = user_id`)로 자기 데이터만 삭제되도록 제한.

## 클레임 생성

1. 클라이언트가 `apps/store/src/features/order/api/claims-api.ts`에서 `public.create_claim(...)` 호출.
2. RPC가 `auth.uid()` 인증, 주문 소유권, 수량/중복 클레임 제약을 검증 후 `claims`에 기록.

## 관리자 주문 상태 변경

1. 관리자가 `apps/admin/src/pages/orders/show.tsx`에서 `public.admin_update_order_status(p_order_id, p_new_status, p_memo, p_is_rollback)` 호출.
2. RPC가 `is_admin()` 확인 후 `order_type`별 상태 전이 규칙 검증.
3. `p_is_rollback = true`일 때: memo 필수, 1단계 이전 상태로만 롤백 허용 (배송중/완료/취소 롤백 금지).
4. RPC가 `orders.status` 업데이트 + `order_status_logs` 감사 로그 INSERT (`is_rollback` 플래그 포함).
5. `배송중` 전환 시 `shipped_at = now()` 자동 설정.

### 주문 롤백 허용 매트릭스

| order_type | 현재 → 롤백 대상 |
|---|---|
| sale | 진행중 → 대기중 |
| custom | 접수 → 대기중, 제작중 → 접수, 제작완료 → 제작중 |
| repair | 접수 → 대기중, 수선중 → 접수, 수선완료 → 수선중 |
| **모든** | **배송중/완료/취소 → 이전: 금지** |

## 관리자 클레임 상태 변경

1. 관리자가 `apps/admin/src/pages/claims/show.tsx`에서 `public.admin_update_claim_status(p_claim_id, p_new_status, p_memo, p_is_rollback)` 호출.
2. RPC가 `is_admin()` 확인 후 `claim.type`별 상태 전이 규칙 검증.
3. `p_is_rollback = true`일 때: memo 필수, 1단계 이전 상태로만 롤백 허용 (수거완료/재발송/완료 롤백 금지). 거부 → 접수 복원은 모든 타입에서 허용.
4. RPC가 `claims.status` 업데이트 + `claim_status_logs` 감사 로그 INSERT (`is_rollback` 플래그 포함).

### 클레임 롤백 허용 매트릭스

| claim.type | 현재 → 롤백 대상 |
|---|---|
| cancel | 처리중 → 접수 |
| return | 수거요청 → 접수 |
| exchange | 수거요청 → 접수 |
| **모든** | 거부 → 접수 (오거부 복원) |
| **모든** | **수거완료/재발송/완료 → 이전: 금지** |

## 책임 분리

- Edge Function (`supabase/functions/create-order/index.ts`)
  - 요청 스키마 검증
  - 인증 확인
  - 배송지 소유권 사전 확인 (빠른 실패)
- 쓰기 RPC (`create_order_txn`, `replace_cart_items`, `create_claim`)
  - 원자적 쓰기 및 무결성
  - 소유권 확인 (`auth.uid()`)
  - 도메인 검증(쿠폰 재검증, 클레임 중복/수량 검증 등)
  - 금액 계산(주문 도메인)
  - 최종 영속화
- 직접 테이블 삭제 (`cart_items` 초기화)
  - RLS 기반 소유권 제약(`auth.uid() = user_id`)
  - 단순 삭제 외 비즈니스 로직 없음

## 보안 참고

- `create-order` Edge는 `Authorization` 헤더 기반 사용자 인증을 강제한다.
- `create_order_txn`, `replace_cart_items`, `create_claim`, `admin_update_order_status`, `admin_update_claim_status`는 `SECURITY DEFINER`.
- 현재 권한 모델에서 일부 쓰기 RPC는 `authenticated`가 실행 가능하므로 RPC 내부 검증이 안전 경계의 핵심이다.

## 필수 규칙 (팀)

1. 새로운 쓰기 흐름은 `클라이언트 -> Edge -> RPC` 또는 `클라이언트 -> RPC` 중 하나를 명시적으로 선택한다.
2. 클라이언트 직접 RPC를 선택한 경우, RPC 내부에 소유권(`auth.uid()`), 입력 검증, 트랜잭션 무결성을 반드시 포함한다.
3. 쓰기 RPC는 보안 모드(`DEFINER` 또는 `INVOKER`)를 명시적으로 선언해야 한다.
4. 개인화된 쓰기 RPC는 `auth.uid()` 소유권 검증을 강제해야 한다.
5. 금액 관련 값은 서버 측(RPC)에서만 계산한다.
6. 권한 부여/회수(`GRANT`/`REVOKE`)는 마이그레이션에서 명시적으로 관리한다.
7. 직접 테이블 쓰기는 예외로 제한하며, 현재 허용 범위는 장바구니 초기화(`cart_items` DELETE)만이다.

## 새 쓰기 흐름 체크리스트

- [ ] 경로를 명시했다. (`클라이언트 -> Edge -> RPC` 또는 `클라이언트 -> RPC`)
- [ ] Edge 경유 경로라면, Edge가 인증/페이로드/사전 조건을 검증한다.
- [ ] RPC가 트랜잭션 쓰기를 수행한다.
- [ ] RPC가 소유권을 확인한다 (`auth.uid()`).
- [ ] 클라이언트 직접 RPC 경로라면, RPC 단독으로도 오남용 방어가 가능하다.
- [ ] 직접 테이블 쓰기 경로라면, RLS만으로 권한 경계가 충분한지 검증했다.
- [ ] 마이그레이션에 명시적 권한 부여/해제가 포함되어 있다.
- [ ] 비인가, 잘못된 페이로드, 정상 경로 테스트를 커버한다.
