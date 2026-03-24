---
domain: sample
last-verified: 2026-03-19
---

# Sample QA

## SC-sample-001: 샘플 주문 폼 완료 및 결제

- Given: store `/sample-order`에 진입한 상태
- When: 샘플 타입, 옵션, 배송지를 선택하고 주문을 생성한다
- Then: 샘플 주문이 생성된다

## SC-sample-002: 결제 확정 후 쿠폰 자동 발급 확인

- Given: sample 주문이 `결제중` 상태다
- When: 결제가 확정된다
- Then: `couponIssued=true`면 쿠폰 발급 메시지가, `false`면 기존 보유 메시지가 표시된다

## SC-sample-003: admin 순방향 전이

- Given: admin `/orders?tab=sample`에서 샘플 주문을 조회한 상태
- When: `접수 -> 제작중 -> 배송중 -> 배송완료 -> 완료`로 변경한다
- Then: 각 상태가 순차 반영된다

## SC-sample-004: admin 롤백

- Given: sample 주문이 `접수` 상태다
- When: memo를 입력하고 `대기중`으로 롤백한다
- Then: 롤백 이력이 남는다

## SC-sample-005: 취소 및 환불

- Given: sample 주문이 `대기중`, `결제중`, 또는 `접수` 상태다
- When: 취소/환불을 처리한다
- Then: 전액 환불된다

## SC-sample-006: 발급된 쿠폰으로 주문제작 결제

- Given: 사용자가 샘플 타입에 해당하는 쿠폰(예: SAMPLE_DISCOUNT_SEWING)을 보유 중이다
- When: custom 주문 결제에 쿠폰을 적용한다
- Then: 해당 쿠폰의 고정 할인금액이 적용된다

## SC-sample-007: 샘플 타입별 정확한 쿠폰 발급

- Given: 5가지 샘플 타입+옵션 조합(sewing / fabric+PRINTING / fabric+YARN_DYED / fabric_and_sewing+PRINTING / fabric_and_sewing+YARN_DYED) 각각에 대해 결제 확정하는 상태
- When: 각 조합별로 샘플 주문을 결제 완료한다
- Then: 각 타입에 맞는 쿠폰(SAMPLE_DISCOUNT_SEWING / SAMPLE_DISCOUNT_FABRIC_PRINTING 등)이 정확히 발급된다

## SC-sample-008: 샘플 쿠폰 중복 발급 방지

- Given: 사용자가 동일한 샘플 타입 주문을 두 번 결제 완료한 상태
- When: 두 번째 결제 확정 후 응답을 확인한다
- Then: couponIssued = false로 반환되고 user_coupons 테이블에 중복 행이 없다
