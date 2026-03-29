---
policy: payment
status: implemented
affects: [sale, repair, custom-order, sample, design]
last-verified: 2026-03-29
---

# 결제 정책 (Payment)

> 토스페이먼츠(TossPayments) SDK를 사용하는 결제 흐름. 주문 결제와 토큰 구매 결제 두 경로를 처리한다.

## 결제 경로

| 결제 경로                 | 대상                    | 결제 확정 후 상태                   |
| ------------------------- | ----------------------- | ----------------------------------- |
| `/order/order-form`       | 일반 구매, 수선         | 일반 구매→`진행중`, 수선→`발송대기` |
| `/order/custom-payment`   | 주문제작                | `접수`                              |
| `/order/sample-payment`   | 샘플 주문               | `접수`                              |
| `/token/purchase/payment` | 디자인 토큰 패키지 구매 | `완료` + 토큰 지급                  |

## 성공/실패 리다이렉트

| 구분           | 성공                      | 실패                   |
| -------------- | ------------------------- | ---------------------- |
| 주문 계열 결제 | `/order/payment/success`  | `/order/payment/fail`  |
| 토큰 구매 결제 | `/token/purchase/success` | `/token/purchase/fail` |

## 핵심 규칙

**PR-payment-001**: 금액 검증 — DB에 저장된 주문 금액 합계와 요청 `amount` 불일치 시 400 에러 반환 (결제 진행 안 함)

**PR-payment-002**: 소유권 검증 — 주문 결제: 모든 주문의 `user_id = auth.uid()`. 토큰 구매: `token_purchases.user_id = auth.uid()`. 불일치 시 403 에러

**PR-payment-003**: 상태 잠금 — 결제 시작 시 `결제중` 상태로 원자적 전환. 이미 `결제중`이면 멱등 처리

**PR-payment-004**: 멱등성 — 모든 주문이 이미 결제 완료 상태이거나 토큰 구매가 이미 `완료` 상태이면 200 OK 즉시 반환

**PR-payment-005**: 실패 복구 — Toss API 호출 실패 시 `결제중` → `대기중` 자동 복구. 쿠폰 `reserved` → `active` 복원

**PR-payment-006**: paymentKey는 로그에서 마스킹 처리

**PR-payment-007**: 주문 계열 성공 경로에서는 결제 승인 확인 후 주문 유형에 따라 다음 화면으로 분기한다. 토큰 구매는 별도 성공 경로로 이동한다

## 상태 잠금 RPC

| RPC                   | 전환                | 특이사항                    |
| --------------------- | ------------------- | --------------------------- |
| `lock_payment_orders` | `대기중` → `결제중` | 이미 `결제중`이면 멱등 처리 |
| `lock_token_payment`  | `대기중` → `결제중` | service_role 전용           |

`lock_payment_orders`는 주문 상태만 변경. 쿠폰 예약(`active` → `reserved`)은 주문 생성 시 `create_order_txn`에서 이미 수행.

## 실패 복구 RPC

| RPC                     | 전환                | 쿠폰 처리                  |
| ----------------------- | ------------------- | -------------------------- |
| `unlock_payment_orders` | `결제중` → `대기중` | `reserved` → `active` 복원 |
| `unlock_token_payment`  | `결제중` → `대기중` | -                          |

## Toss API

- 엔드포인트: `https://api.tosspayments.com/v1/payments/confirm`
- 인증: `Basic base64(secretKey:)` 헤더

## 에러 코드

| HTTP 상태 | 원인                                     |
| --------- | ---------------------------------------- |
| 400       | 요청 필드 누락, 금액 불일치, 잘못된 형식 |
| 401       | 인증 실패                                |
| 403       | 소유권 불일치                            |
| 404       | 주문 또는 토큰 구매 미존재               |
| 409       | 결제 불가능 상태 (이미 결제됨 등)        |
| 502       | Toss API 연결 실패                       |

## 관련 파일

| 파일                                          | 역할                                          |
| --------------------------------------------- | --------------------------------------------- |
| `supabase/functions/confirm-payment/index.ts` | 결제 확정 Edge Function (주문 + 토큰 두 경로) |
| `supabase/schemas/98_functions_payment.sql`   | lock / confirm / unlock RPC                   |

## 횡단 참조

- [[sale]] — 주문 결제 흐름
- [[repair]] — 수선 주문 결제
- [[custom-order]] — 주문 제작 결제
- [[token]] — 토큰 구매 결제
