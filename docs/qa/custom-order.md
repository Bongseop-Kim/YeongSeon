---
domain: custom-order
last-verified: 2026-03-19
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
