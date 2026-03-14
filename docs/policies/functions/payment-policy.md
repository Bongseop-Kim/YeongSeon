# 결제 정책 (Payment Policy)

## 1. 개요

- **구현 상태**: 구현됨
- **결제 수단**: 토스페이먼츠(TossPayments) SDK
- **적용 범위**: 일반/수선/주문제작 주문 결제, 디자인 토큰 구매 결제

---

## 2. 결제 경로

결제는 두 가지 독립적인 경로로 처리된다.

| 경로           | 대상                        | 결제 확정 후 상태                   |
| -------------- | --------------------------- | ----------------------------------- |
| 주문 결제      | sale / repair / custom 주문 | sale→`진행중`, repair/custom→`접수` |
| 토큰 구매 결제 | 디자인 토큰 패키지 구매     | `완료` + 토큰 지급                  |

---

## 3. 멱등성 보장

| 상황                            | 처리 방식          |
| ------------------------------- | ------------------ |
| 모든 주문이 이미 결제 완료 상태 | 200 OK 즉시 반환   |
| 토큰 구매가 이미 `완료` 상태    | 200 OK 즉시 반환   |
| 중간에 `결제중` 상태인 경우     | 정상 흐름으로 진행 |

---

## 4. 금액 검증

1. DB에 저장된 주문 금액 합계를 조회
2. 요청으로 전달된 `amount`와 비교
3. 불일치 시 400 에러 반환 (결제 진행 안 함)

---

## 5. 소유권 검증

- 주문 결제: 모든 주문의 `user_id = auth.uid()` 확인
- 토큰 구매: `token_purchases.user_id = auth.uid()` 확인
- 불일치 시 403 에러 반환

---

## 6. 상태 잠금 (Lock) 메커니즘

결제 시작 시 주문을 `결제중` 상태로 원자적 전환한다.

| RPC                   | 전환                | 특이사항                    |
| --------------------- | ------------------- | --------------------------- |
| `lock_payment_orders` | `대기중` → `결제중` | 이미 `결제중`이면 멱등 처리 |
| `lock_token_payment`  | `대기중` → `결제중` | service_role 전용           |

`lock_payment_orders`는 주문 상태(`대기중` → `결제중`)만 변경한다. 쿠폰 예약(`active` → `reserved`)은 주문 생성 시 `create_order_txn`에서 이미 수행된다.

---

## 7. Toss API 호출

- 엔드포인트: `https://api.tosspayments.com/v1/payments/confirm`
- 인증: `Basic base64(secretKey:)` 헤더
- 민감 정보: paymentKey는 로그에서 마스킹 처리

---

## 8. 실패 복구 (Unlock)

Toss API 호출 실패 시 자동으로 복구한다.

| RPC                     | 전환                | 쿠폰 처리                                     |
| ----------------------- | ------------------- | --------------------------------------------- |
| `unlock_payment_orders` | `결제중` → `대기중` | 이미 `reserved` 상태인 쿠폰을 `active`로 복원 |
| `unlock_token_payment`  | `결제중` → `대기중` | -                                             |

---

## 9. 에러 코드

| HTTP 상태 | 원인                                     |
| --------- | ---------------------------------------- |
| 400       | 요청 필드 누락, 금액 불일치, 잘못된 형식 |
| 401       | 인증 실패                                |
| 403       | 소유권 불일치                            |
| 404       | 주문 또는 토큰 구매 미존재               |
| 409       | 결제 불가능 상태 (이미 결제됨 등)        |
| 502       | Toss API 연결 실패                       |

---

## 10. 관련 프로세스

- [sale-process.md](../processes/sale-process.md)
- [repair-process.md](../processes/repair-process.md)
- [custom-order-process.md](../processes/custom-order-process.md)
- [token-policy.md](./token-policy.md) — 토큰 구매 결제

---

## 11. 관련 파일

| 파일                                          | 역할                                          |
| --------------------------------------------- | --------------------------------------------- |
| `supabase/functions/confirm-payment/index.ts` | 결제 확정 Edge Function (주문 + 토큰 두 경로) |
| `supabase/schemas/98_functions_payment.sql`   | lock / confirm / unlock RPC                   |
