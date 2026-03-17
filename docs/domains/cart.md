---
domain: cart
status: implemented
last-verified: 2026-03-17
---

# Cart (장바구니)

회원/비회원 모두 지원하는 장바구니. 비회원은 로컬스토리지, 회원은 서버 DB(`cart_items`)에 저장. 주문 제작(custom)은 장바구니를 거치지 않는다.

## 경계

| 구분      | 내용                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Always do | 소유권 검증 RLS + RPC 이중 검증(`auth.uid() = user_id`). 로그인 시 로컬 장바구니 있으면 서버 덮어쓰기. 낙관적 업데이트 후 서버 저장, 실패 시 롤백. |
| Ask first | 로그인 시 병합 방식 변경(현재 덮어쓰기). 쿠폰 아이템당 1개 제한 해제.                                                                              |
| Never do  | 비로그인 상태에서 `cart_items` 테이블 직접 접근. custom 주문을 장바구니 경유로 생성. 수량에 음수/0 허용.                                           |

## 상태 전이

없음. CRUD 기반 도메인이며 별도 상태 머신이 존재하지 않는다.

## 비즈니스 규칙

- **BR-cart-001**: 비회원 — 로컬스토리지(`cart_guest`)에 저장. 회원 — 서버 DB(`cart_items`)에 저장.
- **BR-cart-002**: 아이템 타입 — `product`(`product_id` 필수), `reform`(`reform_data` 필수). 하나의 `item_id`에 두 타입 동시 사용 불가.
- **BR-cart-003**: `item_id` 형식 — `product-{id}-{optionId}` 또는 `reform-{id}`. `UNIQUE(user_id, item_id)` 제약으로 중복 불가.
- **BR-cart-004**: 로그인 시 동기화 — 로컬 있음: `replace_cart_items`로 서버 덮어쓰기 후 로컬 삭제. 로컬 없음: 서버 장바구니 유지 (병합 아님).
- **BR-cart-005**: 로그아웃 시 — 이전 사용자 캐시 정리 후 로컬(guest) 장바구니로 전환.
- **BR-cart-006**: `replace_cart_items`는 기존 전체 삭제 후 재삽입 (부분 업데이트 없음).
- **BR-cart-007**: 동일 사용자 동시 요청은 `pg_advisory_xact_lock`으로 직렬화.
- **BR-cart-008**: 수량은 양의 정수만 허용. 쿠폰은 아이템당 1개만 적용 가능.

## 주요 RPC

| RPC                        | SECURITY | 설명                                 |
| -------------------------- | -------- | ------------------------------------ |
| `replace_cart_items`       | DEFINER  | 장바구니 전체 교체 (DELETE + INSERT) |
| `get_cart_items`           | INVOKER  | 장바구니 조회 (상품/쿠폰 정보 JOIN)  |
| `remove_cart_items_by_ids` | DEFINER  | 결제 후 특정 아이템 삭제             |

## 화면 및 진입점

| 앱    | 경로    | 설명     |
| ----- | ------- | -------- |
| store | `/cart` | 장바구니 |

## API 호출 흐름

```
비회원 장바구니
  └─ cart-local-storage.ts (로컬스토리지 CRUD)

회원 장바구니
  └─ cart-api.ts
       ├─ get_cart_items RPC (조회)
       ├─ replace_cart_items RPC (추가/수정/전체 교체)
       └─ remove_cart_items_by_ids RPC (삭제)

로그인 시 동기화 (useCartAuthSync)
  └─ 로컬스토리지 확인
       ├─ 로컬 있음 → replace_cart_items로 서버 덮어쓰기 → 로컬 삭제
       └─ 로컬 없음 → 서버 장바구니 유지

로그아웃 시 (useCartAuthSync)
  └─ 이전 사용자 캐시 정리 → 로컬(guest) 장바구니로 전환
```

## 관련 파일

| 파일                                                       | 설명                      |
| ---------------------------------------------------------- | ------------------------- |
| `supabase/schemas/40_cart_items.sql`                       | `cart_items` 테이블 + RLS |
| `supabase/schemas/92_functions_cart.sql`                   | 장바구니 RPC 전체         |
| `apps/store/src/features/cart/api/cart-api.ts`             | 프론트 API 레이어         |
| `apps/store/src/features/cart/hooks/useCartAuthSync.ts`    | 로그인/로그아웃 동기화    |
| `apps/store/src/features/cart/utils/cart-local-storage.ts` | 로컬스토리지 CRUD         |

## 횡단 참조

- [[sale]] — 장바구니 → 주문서 진입점
- [[repair]] — reform 아이템 장바구니 처리

## 미결 사항

없음.
