# 포인트 정책 (Point Policy)

## 1. 개요

- **구현 상태**: 부분 구현 (DB 스키마 + 구매확정 포인트 적립만 구현, 프론트엔드/사용 로직 미구현)
- **적용 범위**: 구매확정 시 포인트 적립 (향후 결제 시 포인트 사용 예정)

---

## 2. 포인트 원장 타입

| 타입 | 설명 | 방향 |
|------|------|------|
| `earn` | 포인트 적립 (구매확정, 이벤트 등) | +잔액 |
| `use` | 포인트 사용 (주문 할인 등) | -잔액 |
| `expire` | 만료 처리 | -잔액 |
| `admin` | 관리자 수동 조정 | ±잔액 |

---

## 3. 구매확정 포인트 적립 규칙

구매확정 시 포인트를 적립한다. 적립률은 확정 방식에 따라 다르다.

| 확정 방식 | 적립률 | 트리거 |
|---------|--------|--------|
| 수동 확정 (고객 직접) | 결제 금액의 **2%** | `customer_confirm_purchase` |
| 자동 확정 (7일 경과) | 결제 금액의 **0.5%** | `auto_confirm_delivered_orders` (pg_cron) |

포인트는 `earn` 타입으로 `points` 테이블에 기록된다.

두 함수 모두 `order_type` 필터 없이 상태(`배송중`, `배송완료`)만 기준으로 처리하므로, **sale / repair / custom 모든 주문 타입에 동일하게 적립된다.**

- **디자인 토큰 구매**: 포인트 적립 대상 아님. 토큰 자체가 별도 과금 체계로 운영됨.
- **견적 요청(quote-request)**: 포인트 적립 대상 아님. 결제가 시스템 밖에서 별도 협의로 처리됨.

---

## 4. 포인트 만료

- `expires_at` 필드로 만료일 지정 가능
- `NULL`이면 만료 없음
- `get_user_point_balance()`는 만료되지 않은 포인트의 합산 잔액 반환

---

## 5. 현재 구현 상태

### 구현됨
- `points` 테이블 스키마
- `get_user_point_balance()` RPC (잔액 조회)
- 포인트 적립은 `customer_confirm_purchase` (수동 확정) 및 `auto_confirm_delivered_orders` (자동 확정)에서 수행됨

### 미구현
- 프론트엔드 포인트 잔액 표시 UI
- 주문 시 포인트 사용 로직
- 포인트 만료 처리 자동화
- 포인트 내역 조회 API

---

## 6. 접근 제어 (RLS)

| 권한 | 규칙 |
|------|------|
| SELECT | 본인 포인트만 조회 가능 (`user_id = auth.uid()`) |
| SELECT (관리자) | 전체 조회 가능 |
| INSERT/UPDATE/DELETE | RPC 전용 (직접 접근 불가) |

---

## 7. 관련 프로세스

- [sale-process.md](../processes/sale-process.md) — 구매확정 시 포인트 적립
- [repair-process.md](../processes/repair-process.md) — 구매확정 시 포인트 적립
- [custom-order-process.md](../processes/custom-order-process.md) — 구매확정 시 포인트 적립

---

## 8. 관련 파일

| 파일 | 역할 |
|------|------|
| `supabase/schemas/85_points.sql` | points 테이블 + get_user_point_balance RPC |
| `supabase/schemas/93_functions_orders.sql` | 구매확정 시 포인트 적립 로직 포함 |
