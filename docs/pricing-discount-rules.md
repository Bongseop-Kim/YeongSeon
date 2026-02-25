# 가격 및 할인 규칙

## 범위

- `create_order_txn` 내 주문 쓰기 RPC 가격/할인 계산.
- 아이템별 할인 및 라인 합계에 대한 쿠폰 적용 규칙.

## 핵심 불변식

1. 금액은 RPC에서 서버 측으로만 계산한다.
2. 단위 할인은 `0 <= unit_discount <= unit_price`를 만족해야 한다.
3. 라인 할인은 `line_discount = unit_discount * quantity`를 만족해야 한다.
4. 주문 총 할인은 모든 라인 할인의 합과 같아야 한다.

## 쿠폰 캡 규칙 (주문 도메인)

쿠폰이 라인 아이템에 적용될 때:

1. 쿠폰 타입으로부터 단위당 초기 할인 계산:
   - `percentage`: `floor(unit_price * (discount_value / 100))`
   - `fixed`: `floor(discount_value)`
2. 단위 가격으로 단위 할인 클램프:
   - `unit_discount = greatest(0, least(unit_discount, unit_price))`
3. `max_discount_amount`가 존재하면 단위당 캡 먼저 적용:
   - `per_unit_cap = floor(max_discount_amount / quantity)`
   - `unit_discount = least(unit_discount, per_unit_cap)`
4. 캡이 적용된 단위 할인으로 라인 할인 재계산:
   - `line_discount = unit_discount * quantity`

## 단위당 캡 우선 적용 이유

- 다음 사이의 불일치 방지:
  - `total_discount` 집계값과
  - 저장된 라인별 할인 금액의 합.
- 반올림 오차를 유발하는 사후 역계산(`line → unit`)을 회피.

## 구현 참조

- `supabase/schemas/91_functions.sql` (`create_order_txn` — 쿠폰 캡 로직)
- `supabase/schemas/51_order_items.sql` (`line_discount_amount` 컬럼)
