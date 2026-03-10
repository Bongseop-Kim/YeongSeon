# 프로세스 & 정책 문서

프로젝트의 비즈니스 프로세스와 정책을 체계적으로 정리한 문서 모음이다.

- **프로세스**: 피쳐별 워크플로우, 상태 전이
- **정책**: 여러 피쳐에 걸치는 횡단 관심사 (결제, 쿠폰, 토큰 등)

---

## 프로세스 문서 (`processes/`)

| 문서 | 설명 | 구현 상태 |
|------|------|---------|
| [cart-process.md](./processes/cart-process.md) | 장바구니 회원/비회원 저장, 로그인 동기화 | 구현됨 |
| [sale-process.md](./processes/sale-process.md) | 일반 상품 주문 워크플로우 및 상태 전이 | 구현됨 |
| [repair-process.md](./processes/repair-process.md) | 수선 주문 워크플로우, 혼합 장바구니 처리 | 구현됨 |
| [custom-order-process.md](./processes/custom-order-process.md) | 주문 제작 워크플로우, 서버 금액 계산 | 구현됨 |
| [claim-process.md](./processes/claim-process.md) | 취소/반품/교환 클레임 상태 전이 | 구현됨 |
| [quote-request-process.md](./processes/quote-request-process.md) | 대량 주문 견적 요청 워크플로우 | 구현됨 |
| [design-process.md](./processes/design-process.md) | AI 디자인 생성, 토큰 차감/환불 | 구현됨 |

---

## 정책 문서 (`functions/`)

| 문서 | 설명 | 구현 상태 |
|------|------|---------|
| [payment-policy.md](./functions/payment-policy.md) | 토스페이먼츠 결제 흐름, 멱등성, 실패 복구 | 구현됨 |
| [coupon-policy.md](./functions/coupon-policy.md) | 쿠폰 할인 계산, 생명주기, 상한 처리 | 구현됨 |
| [token-policy.md](./functions/token-policy.md) | 디자인 토큰 원장, 구매 흐름, 동시성 제어 | 구현됨 |
| [point-policy.md](./functions/point-policy.md) | 포인트 원장 (DB만 구현, 프론트 미구현) | 부분 구현 |
| [notification-policy.md](./functions/notification-policy.md) | 알림 (향후 구현 예정, 요구사항 정리) | 미구현 |

---

## 구조 설명

```
docs/policies/
├── README.md                      # 이 파일
│
├── processes/                     # 피쳐별 프로세스
│   ├── cart-process.md
│   ├── sale-process.md
│   ├── repair-process.md
│   ├── custom-order-process.md
│   ├── claim-process.md
│   ├── quote-request-process.md
│   └── design-process.md
│
└── functions/                     # 기능별 정책
    ├── payment-policy.md
    ├── coupon-policy.md
    ├── token-policy.md
    ├── point-policy.md
    └── notification-policy.md
```

---

## 상태 전이 요약

### 주문 타입별 상태 전이

| 타입 | 전이 |
|------|------|
| sale | 대기중 → 결제중 → 진행중 → 배송중 → 배송완료 → 완료 |
| repair | 대기중 → 결제중 → 접수 → 수선중 → 수선완료 → 배송중 → 배송완료 → 완료 |
| custom | 대기중 → 결제중 → 접수 → 제작중 → 제작완료 → 배송중 → 배송완료 → 완료 |

### 클레임 타입별 상태 전이

| 타입 | 전이 |
|------|------|
| cancel | 접수 → 처리중 → 완료 |
| return | 접수 → 수거요청 → 수거완료 → 완료 |
| exchange | 접수 → 수거요청 → 수거완료 → 재발송 → 완료 |

### 견적 요청 상태 전이

```
요청 → 견적발송 → 협의중 → 확정
     ↘ 어느 단계에서든 → 종료
```
