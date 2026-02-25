# Security Model

범위: 주문/장바구니/클레임 도메인 중심

## 핵심 원칙

1. 인증/소유권은 DB 계층에서 최종 강제한다. (`auth.uid()`, RLS, RPC 검증)
2. 쓰기 금액 계산은 서버(RPC)에서만 수행한다.
3. 클라이언트 입력은 신뢰하지 않고, RPC 내부에서 재검증한다.
4. 보안 모드는 모든 RPC에 명시한다. (`SECURITY DEFINER` 또는 `SECURITY INVOKER`)

## Role Matrix (요약)

| Resource | anon | authenticated | service_role | 강제 수단 |
|---|---|---|---|---|
| `orders` | 제한 | 본인 행 select/insert, 관리자 상태 업데이트 정책 | 전체 관리 가능 | RLS + 정책 |
| `order_items` | 제한 | 본인 주문 기준 select/insert | 전체 관리 가능 | RLS + 정책 |
| `cart_items` | 제한 | 본인 행 select/insert/update/delete | 전체 관리 가능 | RLS + 정책 |
| `claims` | 제한 | 본인 행 select/insert, 관리자 status update | 전체 관리 가능 | RLS + 컬럼 권한 |
| `shipping_addresses` | 제한 | 본인 행 CRUD | 전체 관리 가능 | RLS + 정책 |
| `user_coupons` | 제한 | 본인 행 select 중심 | 전체 관리 가능 | RLS + 정책 |
| `create_order_txn` | 제한 | 실행 가능(현재 권한 모델) | 실행 가능 | RPC 내부 검증 + 보안 모드 |
| `replace_cart_items` | 제한 | 실행 가능(현재 권한 모델) | 실행 가능 | RPC 내부 검증 + 보안 모드 |
| `create_claim` | 제한 | 실행 가능(현재 권한 모델) | 실행 가능 | RPC 내부 검증 + 보안 모드 |
| `get_cart_items` | 제한 | 실행 가능 | 실행 가능 | `SECURITY INVOKER` + `auth.uid()` |

## Path-Based Guards

### 주문 생성 (`Client -> Edge -> create_order_txn`)

- Edge: Authorization 헤더 기반 사용자 인증 + 입력 형식/사전조건 검증
- RPC:
  - `auth.uid()` 필수
  - 배송지 소유권 검증
  - 쿠폰 상태/만료/중복 사용 검증
  - 금액/할인/합계 서버 계산

### 장바구니 교체 (`Client -> replace_cart_items`)

- RPC:
  - `auth.uid()` 필수
  - `p_user_id = auth.uid()` 강제
  - 수량/입력 JSON 형식 검증
  - 트랜잭션 교체 처리

### 장바구니 초기화 (`Client -> cart_items DELETE`)

- 테이블 직접 쓰기 예외 경로
- RLS로 `auth.uid() = user_id` 범위만 삭제 허용

### 클레임 생성 (`Client -> create_claim`)

- RPC:
  - `auth.uid()` 필수
  - 주문 소유권 검증
  - `item_id(text)` -> `order_items.id(uuid)` 변환 검증
  - 수량 상한/중복 클레임 검증

## 금지 패턴

- UI 타입을 RPC 입출력으로 직접 사용
- 클라이언트 제공 금액/합계를 서버 검증 없이 저장
- `SECURITY` 모드 미지정 RPC
- `auth.uid()` 소유권 검증 없는 개인화 write RPC
- 예외 정의 없이 직접 테이블 쓰기 추가

## 변경 시 체크

- 새 write/read 경로 추가 시 `rpc-contracts.md`, `supabase-write-boundary.md` 동시 갱신
- GRANT/REVOKE 변화가 있으면 마이그레이션과 문서를 함께 갱신
