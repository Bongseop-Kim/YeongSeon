# Minimum Verification

목표: 머지/배포 전에 반드시 통과해야 하는 최소 검증 기준 정의

## 1) 정적 검증

- [ ] 타입 체크 통과 (`pnpm -s exec tsc --noEmit`)
- [ ] 변경한 도메인의 핵심 테스트 통과 (있다면 unit/integration 우선)

## 2) Write Path 최소 시나리오

### 주문 생성 (`create-order` -> `create_order_txn`)

- [ ] 정상 주문 생성 성공 (order_id/order_number 반환)
- [ ] 잘못된 배송지 소유권으로 실패
- [ ] 잘못된 쿠폰/만료 쿠폰으로 실패

### 장바구니 교체 (`replace_cart_items`)

- [ ] 정상 교체 성공
- [ ] `p_user_id != auth.uid()`로 실패
- [ ] `quantity <= 0` 입력으로 실패

### 장바구니 초기화 (`cart_items DELETE`)

- [ ] 본인 장바구니만 삭제 성공
- [ ] 타인 `user_id` 조건 삭제 시도 시 실패(RLS 차단)

### 클레임 생성 (`create_claim`)

- [ ] 정상 클레임 생성 성공
- [ ] 타인 주문에 대한 클레임 생성 실패
- [ ] 동일 아이템/유형 활성 클레임 중복 생성 실패

## 3) Auth/RLS 음수 테스트

- [ ] 비인증 상태에서 개인화 view/rpc 접근 차단 확인
- [ ] 직접 테이블 쓰기 예외 경로(`cart_items` DELETE)가 RLS로 제한되는지 확인

## 4) 금액 불변식 테스트 (주문)

- [ ] `0 <= unit_discount <= unit_price`
- [ ] `unit_discount = floor(capped_line_discount / quantity)` (나머지 분배 방식)
- [ ] `line_discount = unit_discount * quantity + remainder` (remainder = capped_line_discount % quantity, 0 이상 quantity-1 이하)
- [ ] `total_discount = sum(line_discount)`
- [ ] 쿠폰 캡(`max_discount_amount`) 적용 시 `line_discount <= max_discount_amount` 및 라인 합계 정합 유지

## 5) Release Gate

다음 중 하나라도 실패하면 배포 차단:

- 위 체크리스트의 필수 항목 미통과
- 신규 write 경로 추가 후 문서(`rpc-contracts.md`, `security-model.md`, `supabase-write-boundary.md`) 미갱신
- Supabase CLI 오류 발생 시 에러 전문 미공유/자동 재시도 수행
