---
domain: custom-order
last-verified: 2026-03-29
---

# Custom Order QA

## SC-custom-001: 마법사 전 단계 완료

- Given: store `/custom-order`에 진입한 상태
- When: 수량, 원단, 봉제, 스펙, 마감, 첨부 단계를 모두 입력한다
- Then: 확인 단계까지 정상 진행된다

## SC-custom-002: 주문 결제 후 접수 상태 확인

- Given: store `/custom-order`에서 주문 정보를 입력한 상태
- When: 결제를 완료한다
- Then: 주문 상세에서 `접수` 상태가 표시된다

## SC-custom-003: admin 접수 -> 제작중

- Given: admin `/orders/show/:id`에서 custom 주문이 `접수` 상태다
- When: 다음 상태로 변경한다
- Then: `제작중`으로 변경된다

## SC-custom-004: admin 제작중 -> 제작완료 -> 배송중

- Given: admin `/orders/show/:id`에서 custom 주문이 `제작중` 상태다
- When: 순서대로 상태를 변경한다
- Then: `제작완료`, `배송중`으로 순차 반영된다

## SC-custom-005: admin 제작중 -> 접수 롤백

- Given: admin `/orders/show/:id`에서 custom 주문이 `제작중` 상태다
- When: memo를 입력하고 롤백한다
- Then: `접수`로 변경되고 이력이 남는다

## SC-custom-006: 제작중 취소 버튼 미노출

- Given: admin 또는 store에서 custom 주문이 `제작중` 상태다
- When: 주문 상세를 조회한다
- Then: 취소 버튼이 표시되지 않는다

## SC-custom-007: 마법사 중간 이탈 후 재진입 시 임시 저장 복원

- Given: store `/custom-order`에서 마법사 Step 4(스펙)까지 입력한 상태
- When: 브라우저를 새로고침하거나 다른 페이지로 이동 후 다시 진입한다
- Then: 이전에 작성 중이던 주문 복원 안내가 표시되고 이어서 하기 시 Step 4로 복원된다. 단, referenceImages와 연락처는 제거되어 있다

## SC-custom-008: 마법사 단계별 필수 항목 미입력 시 다음 단계 진행 불가

- Given: store `/custom-order`에서 마법사 진행 중인 상태
- When: fabricProvided=false 인데 fabricType을 선택하지 않은 채 다음 단계를 시도한다
- Then: 버튼이 비활성화되거나 필수 입력 안내가 표시되고 다음 단계로 진행되지 않는다

## SC-custom-009: 옵션 가격 클라이언트 미리보기와 서버 계산 일치 검증

- Given: custom-order 마법사에서 여러 옵션(수량, 원단제공여부, 봉제, 심지 등)을 선택한 상태
- When: 마법사 확인 단계에서 예상 금액을 확인한다
- Then: 클라이언트에서 표시하는 예상 금액과 실제 주문 생성 후 서버에서 반환하는 금액이 일치한다

## SC-custom-010: 주문제작 쿠폰 예약

- Given: 사용 가능한 쿠폰을 가진 사용자가 store `/custom-order`에서 주문 정보를 모두 입력한 상태
- When: 쿠폰을 적용해 주문을 생성하고 `/order/custom-payment`로 진입한다
- Then: 해당 `user_coupons.status`는 `reserved`가 된다

## SC-custom-011: 주문제작 결제 실패 또는 취소 시 쿠폰 복원

- Given: 주문제작 주문 생성 후 적용 쿠폰이 `reserved` 상태다
- When: 결제에 실패하거나 주문을 취소한다
- Then: 해당 쿠폰은 `active`로 복원된다
