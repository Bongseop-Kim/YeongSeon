# 장바구니 프로세스 (Cart)

## 1. 개요

장바구니는 회원/비회원 모두 지원한다.
- **비회원**: 로컬스토리지(`cart_guest`)에 저장
- **회원**: 서버 DB(`cart_items`)에 저장

주문 제작(custom)은 장바구니를 거치지 않고 별도 플로우로 생성된다.

---

## 2. 아이템 타입

| 타입 | 설명 | 필수 필드 |
|------|------|---------|
| `product` | 일반 상품 | `product_id` |
| `reform` | 수선 | `reform_data` |

- 하나의 `item_id`에 product와 reform 동시 사용 불가
- `item_id` 형식: `product-{id}-{optionId}` 또는 `reform-{id}`
- 동일 사용자 + 동일 `item_id` 중복 불가 (`UNIQUE` 제약)

---

## 3. 로그인/로그아웃 시 동기화

### 로그인
```
1. 서버 장바구니 조회
2. 로컬(guest) 장바구니 확인
   ├─ 로컬 있음 → replace_cart_items로 서버 덮어쓰기 → 로컬 삭제
   └─ 로컬 없음 → 서버 장바구니 그대로 사용
```

> 로컬이 비어있으면 서버 장바구니가 유지된다.
> 로컬에 아이템이 있으면 서버 장바구니를 덮어쓴다 (병합 아님).

### 로그아웃
```
1. 이전 사용자 캐시 정리
2. 로컬(guest) 장바구니로 전환
```

---

## 4. 서버 동기화 규칙

- 장바구니 변경 시 낙관적 업데이트 후 서버 저장
- 서버 저장 실패 시 이전 상태로 롤백
- `replace_cart_items`는 기존 전체 삭제 후 재삽입 (부분 업데이트 없음)
- 동일 사용자의 동시 요청은 `pg_advisory_xact_lock`으로 직렬화

---

## 5. 제약 조건

| 항목 | 규칙 |
|------|------|
| 수량 | 양의 정수만 허용 |
| 쿠폰 | 아이템당 1개만 적용 가능 |
| 소유권 | `auth.uid() = user_id` 검증 (RLS + RPC 이중 검증) |
| 아이템 중복 | `UNIQUE(user_id, item_id)` — 같은 상품+옵션은 수량으로 관리 |

---

## 6. 주요 RPC

| RPC | 권한 | 설명 |
|-----|------|------|
| `replace_cart_items` | DEFINER | 장바구니 전체 교체 (DELETE + INSERT) |
| `get_cart_items` | INVOKER | 장바구니 조회 (상품/쿠폰 정보 JOIN) |
| `remove_cart_items_by_ids` | DEFINER | 결제 후 특정 아이템 삭제 |

---

## 7. 관련 파일

| 파일 | 역할 |
|------|------|
| `supabase/schemas/40_cart_items.sql` | cart_items 테이블 + RLS |
| `supabase/schemas/92_functions_cart.sql` | 장바구니 RPC 전체 |
| `apps/store/src/features/cart/api/cart-api.ts` | 프론트 API 레이어 |
| `apps/store/src/features/cart/hooks/useCartAuthSync.ts` | 로그인/로그아웃 동기화 |
| `apps/store/src/features/cart/utils/cart-local-storage.ts` | 로컬스토리지 CRUD |
