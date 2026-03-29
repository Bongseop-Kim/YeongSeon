---
domain: token-refund
last-verified: 2026-03-29
---

# Token Refund QA

## SC-token-refund-001: 최신 완료 토큰 주문 환불 신청 가능

- Given: 사용자가 가장 최근 완료 토큰 주문을 보유하고, 그 주문 지급 이후 토큰 사용 이력이 없는 상태
- When: 환불 신청을 한다
- Then: `token_refund` 클레임이 `접수` 상태로 생성된다

## SC-token-refund-002: 최신 주문이 아니면 환불 신청 불가

- Given: 사용자가 완료된 토큰 주문을 2건 이상 보유하고, 더 최근 완료 주문이 따로 있는 상태
- When: 이전 주문으로 환불 신청을 한다
- Then: 환불 신청이 거부된다

## SC-token-refund-003: 지급 후 토큰 사용 이력이 있으면 환불 신청 불가

- Given: 토큰 주문 완료 후 지급된 유상 토큰으로 디자인 생성을 사용한 상태
- When: 환불 신청을 한다
- Then: 환불 신청이 거부된다

## SC-token-refund-004: 접수 상태 환불 요청 고객 취소

- Given: `token_refund` 클레임이 `접수` 상태다
- When: 고객이 환불 취소를 요청한다
- Then: 클레임 상태가 `거부`로 변경된다

## SC-token-refund-005: 승인 시 주문 취소와 토큰 회수

- Given: `token_refund` 클레임이 `접수` 상태다
- When: 서비스 경로가 환불을 승인한다
- Then: 유상 토큰이 회수되고 주문 상태는 `취소`, 클레임 상태는 `완료`가 된다
