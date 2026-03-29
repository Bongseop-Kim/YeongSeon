---
domain: cart
status: implemented
last-verified: 2026-03-29
---

# Cart (장바구니)

회원/비회원 모두 지원하는 장바구니. 비회원은 로컬스토리지, 회원은 서버 DB(`cart_items`)에 저장한다. 주문 제작(custom)은 장바구니를 거치지 않는다.

## 경계

| 구분      | 내용                                                                                                                                          |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Always do | 소유권 검증이 있는 서버 경로만 사용한다. 로그인 시 로컬 장바구니가 있으면 서버 장바구니를 덮어쓴다. 낙관적 업데이트 후 저장 실패 시 롤백한다. |
| Ask first | 로그인 시 병합 방식 변경(현재 덮어쓰기). 쿠폰 아이템당 1개 제한 해제.                                                                         |
| Never do  | 비로그인 상태에서 `cart_items` 직접 접근. custom 주문을 장바구니 경유로 생성. 수량에 음수/0 허용.                                             |

## 상태 전이

없음. CRUD 기반 도메인이며 별도 상태 머신이 존재하지 않는다.

## 비즈니스 규칙

- **BR-cart-001**: 비회원 — 로컬스토리지(`cart_guest`)에 저장. 회원 — 서버 DB(`cart_items`)에 저장.
- **BR-cart-002**: 아이템 타입 — `product`(`product_id` 필수), `reform`(`reform_data` 필수). 하나의 `item_id`에 두 타입 동시 사용 불가.
- **BR-cart-003**: `item_id` 형식 — `product-{id}-{optionId}` 또는 `reform-{id}`. `UNIQUE(user_id, item_id)` 제약으로 중복 불가.
- **BR-cart-004**: 로그인 시 동기화 — 로컬 있음: 서버 장바구니를 덮어쓴 뒤 로컬을 삭제한다. 로컬 없음: 서버 장바구니를 유지한다. 병합은 하지 않는다.
- **BR-cart-005**: 로그아웃 시 — 이전 사용자 캐시 정리 후 로컬(guest) 장바구니로 전환.
- **BR-cart-006**: 로그인/비로그인 모두 장바구니 변경은 먼저 화면 캐시에 반영하고, 저장 실패 시 이전 상태로 롤백한다.
- **BR-cart-007**: 서버 장바구니 동기화의 기본 쓰기 방식은 전체 교체다. 부분 수정 대신 현재 장바구니 전체를 기준으로 서버 상태를 맞춘다.
- **BR-cart-008**: 동일 사용자 동시 요청은 서버에서 직렬화하여 DELETE + INSERT 인터리빙을 방지한다.
- **BR-cart-009**: 수량은 양의 정수만 허용한다. 쿠폰은 아이템당 1개만 적용 가능하다.
- **BR-cart-010**: 장바구니 조회 시 비활성/만료 쿠폰은 적용 쿠폰 정보에서 제외된다.
- **BR-cart-011**: 회원 장바구니 쓰기는 소유권 검증이 있는 서버 경로만 허용한다. 예외적으로 장바구니 전체 비우기는 `cart_items` 직접 DELETE를 허용한다.

## 화면 및 진입점

| 앱    | 경로    | 설명     |
| ----- | ------- | -------- |
| store | `/cart` | 장바구니 |

## API 호출 흐름

```
비회원 장바구니
  └─ entities/cart/model/cart-local-storage.ts (로컬스토리지 CRUD)

회원 장바구니
  └─ entities/cart/api
       ├─ 서버 조회
       ├─ 전체 교체 기반 동기화
       ├─ 결제 후 선택 아이템 제거
       └─ 전체 비우기 예외 처리

로그인 시 동기화 (useCartAuthSync)
  └─ 로컬스토리지 확인
       ├─ 로컬 있음 → 서버 장바구니 덮어쓰기 → 로컬 삭제
       └─ 로컬 없음 → 서버 장바구니 유지

로그아웃 시 (useCartAuthSync)
  └─ 이전 사용자 캐시 정리 → 로컬(guest) 장바구니로 전환
```

## 관련 파일

| 파일                                                           | 설명                          |
| -------------------------------------------------------------- | ----------------------------- |
| `supabase/schemas/40_cart_items.sql`                           | `cart_items` 테이블 + RLS     |
| `supabase/schemas/92_functions_cart.sql`                       | 장바구니 서버 함수 정의       |
| `apps/store/src/entities/cart/api/cart-api.ts`                 | 서버 장바구니 API             |
| `apps/store/src/entities/cart/api/cart-query.ts`               | 회원 장바구니 쿼리/뮤테이션   |
| `apps/store/src/entities/cart/model/cart-local-storage.ts`     | guest 장바구니 로컬 저장소    |
| `apps/store/src/features/cart/hooks/useCart.ts`                | 장바구니 조작/롤백 오케스트라 |
| `apps/store/src/features/cart/hooks/useCartAuthSync.ts`        | 로그인/로그아웃 동기화        |
| `apps/store/src/widgets/cart-checkout/ui/CartCheckoutPage.tsx` | 장바구니 화면 조합            |
| `apps/store/src/pages/cart/index.tsx`                          | 페이지 엔트리                 |

## 횡단 참조

- [[sale]] — 장바구니 → 주문서 진입점
- [[repair]] — reform 아이템 장바구니 처리

## 미결 사항

없음.
