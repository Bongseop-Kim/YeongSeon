# RPC Contracts

범위: `apps/store` 기준 주문/장바구니/클레임 + 주요 읽기 경로

## Write Contracts

| Contract | Kind | Client Entrypoint | Backend Entrypoint | Security | Ownership Check | Server Amount Calc | 비고 |
|---|---|---|---|---|---|---|---|
| 주문 생성 | Write | `apps/store/src/features/order/api/order-api.ts` -> `functions.invoke("create-order")` | `public.create_order_txn` | `SECURITY DEFINER` | `auth.uid()` + 배송지 소유권 + 쿠폰 소유권 검증 | Yes | 권장 기본 경로(`Client -> Edge -> RPC`) |
| 장바구니 교체 | Write | `apps/store/src/features/cart/api/cart-api.ts` -> `rpc("replace_cart_items")` | `public.replace_cart_items` | `SECURITY DEFINER` | `p_user_id = auth.uid()` | N/A | 직접 RPC 허용 |
| 장바구니 초기화 | Write (Table) | `apps/store/src/features/cart/api/cart-api.ts` -> `from("cart_items").delete()` | `public.cart_items` | RLS | `auth.uid() = user_id` | N/A | 직접 테이블 쓰기 예외 |
| 클레임 생성 | Write | `apps/store/src/features/order/api/claims-api.ts` -> `rpc("create_claim")` | `public.create_claim` | `SECURITY DEFINER` | `auth.uid()` + 주문 소유권 + 아이템 검증 | N/A | 직접 RPC 허용 |
| 주문 상태 변경 | Write | `apps/admin/src/pages/orders/show.tsx` -> `rpc("admin_update_order_status")` | `public.admin_update_order_status` | `SECURITY DEFINER` | `is_admin()` + `order_type`별 전이 규칙 | N/A | 관리자 전용, 감사 로그 자동 기록, `p_is_rollback`으로 1단계 롤백 지원 |
| 클레임 상태 변경 | Write | `apps/admin/src/pages/claims/show.tsx` -> `rpc("admin_update_claim_status")` | `public.admin_update_claim_status` | `SECURITY DEFINER` | `is_admin()` + `claim.type`별 전이 규칙 | N/A | 관리자 전용, 감사 로그 자동 기록, `p_is_rollback`으로 1단계 롤백 지원 |

## Read Contracts

| Contract | Kind | Client Path | Backend Resource | Security/Guard | DTO 경계 |
|---|---|---|---|---|---|
| 상품 목록/상세 | Read | `apps/store/src/features/shop/api/products-api.ts` | `public.product_list_view` | View + RLS/정책 | `ProductDTO -> Product` 매핑 |
| 주문 목록/상세/아이템 | Read | `apps/store/src/features/order/api/order-api.ts` | `public.order_list_view`, `public.order_detail_view`, `public.order_item_view` | View + 소유권 제약 | `*RowDTO/*ViewDTO -> Order` 매핑 |
| 클레임 목록 | Read | `apps/store/src/features/order/api/claims-api.ts` | `public.claim_list_view` | View + `auth.uid()` 제약 | `ClaimListRowDTO -> ClaimItem` 매핑 |
| 장바구니 조회 | Read | `apps/store/src/features/cart/api/cart-api.ts` | `public.get_cart_items` | `SECURITY INVOKER` + `auth.uid()` 검증 | `CartItemViewDTO -> CartItem` 매핑 |
| 주문 상태 변경 이력 | Read | `apps/admin/src/pages/orders/show.tsx` | `public.admin_order_status_log_view` | View + `security_invoker` + RLS (관리자/주문소유자) | `OrderStatusLogDTO` 직접 소비 |
| 클레임 상태 변경 이력 | Read | `apps/admin/src/pages/claims/show.tsx` | `public.admin_claim_status_log_view` | View + `security_invoker` + RLS (관리자/클레임소유자) | `ClaimStatusLogDTO` 직접 소비 |

## Contract Rules

- 새 RPC는 UI 타입을 직접 입출력으로 사용하지 않는다.
- 금액/할인/합계는 서버(RPC)에서 계산한다.
- 개인화된 write/read RPC는 `auth.uid()` 기반 소유권 검증을 포함한다.
- 직접 테이블 쓰기는 예외로 제한하고, 현재 허용 범위는 `cart_items` 초기화뿐이다.
