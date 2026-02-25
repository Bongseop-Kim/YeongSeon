# 가격 및 할인 규칙

## 범위

- `create_order_txn` 내 주문 쓰기 RPC 가격/할인 계산.
- 아이템별 할인 및 라인 합계에 대한 쿠폰 적용 규칙.

## 핵심 불변식

1. 금액은 RPC에서 서버 측으로만 계산한다.
2. 단위 할인은 `0 <= unit_discount <= unit_price`를 만족해야 한다.
3. 라인 할인은 나머지 분배 방식: `line_discount = unit_discount * quantity + remainder` (0 <= remainder < quantity).
4. 주문 총 할인은 모든 라인 할인의 합과 같아야 한다: `total_discount = sum(line_discount)`.

## 쿠폰 캡 규칙 (주문 도메인)

쿠폰이 라인 아이템에 적용될 때:

1. 쿠폰 타입으로부터 단위당 초기 할인 계산:
   - `percentage`: `floor(unit_price * (discount_value / 100))`
   - `fixed`: `floor(discount_value)`
2. 단위 가격으로 단위 할인 클램프:
   - `unit_discount = greatest(0, least(unit_discount, unit_price))`
3. 라인 전체 할인 계산 후 `max_discount_amount` 캡 적용:
   - `capped_line_discount = least(unit_discount * quantity, max_discount_amount)`
4. 캡이 적용된 라인 할인을 단위로 역분배 (나머지 분배):
   - `unit_discount = floor(capped_line_discount / quantity)`
   - `remainder = capped_line_discount % quantity`
   - `line_discount = unit_discount * quantity + remainder` (= `capped_line_discount`)

## 라인 캡 + 나머지 분배 방식 이유

- 라인 단위로 캡을 적용하여 할인 손실 없이 `max_discount_amount`를 정확히 반영.
- 단위당 캡 우선 방식(`floor(max / qty)`)은 `floor` 절삭으로 최대 `quantity - 1`원 손실 가능.
- 나머지(`remainder`)는 논리적으로 첫 `remainder`개 아이템에 +1원씩 분배되며, 저장은 라인 합계(`line_discount_amount`)로 보존.

## 구현 참조

- `supabase/schemas/91_functions.sql` (`create_order_txn` — 쿠폰 캡 로직)
- `supabase/schemas/51_order_items.sql` (`line_discount_amount` 컬럼)
