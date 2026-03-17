# YeongSeon 문서 지도

> **AI 개발 파이프라인 참조 가이드**
> 코드 생성 전 반드시 해당 도메인 문서를 읽는다. 상태 전이 규칙은 `domains/`가 단일 소스 오브 트루스다.

---

## 구조

```
docs/
├── README.md               ← 이 파일 (문서 지도 + AI 참조 가이드)
├── domains/                ← 도메인 스펙 (AI 코드 생성의 핵심 입력값)
├── policies/               ← 횡단 관심사 (결제·쿠폰·토큰·알림)
├── qa/                     ← QA 시나리오 (Given-When-Then, E2E 전환용)
├── troubleshooting/        ← 트러블슈팅 템플릿
└── plans/                  ← 구현 계획 (superpowers 전용)
```

---

## 도메인 문서 (`domains/`)

| 문서              | 설명                                                        | 상태        |
| ----------------- | ----------------------------------------------------------- | ----------- |
| [[sale]]          | 일반 상품 주문 — 장바구니/바로구매 → 결제 → 배송 → 구매확정 | implemented |
| [[repair]]        | 수선 주문 — reform 아이템, 혼합 장바구니, 발송 흐름         | partial     |
| [[custom-order]]  | 주문 제작 — 마법사 UI, 샘플 단계 분기, 옵션 가격 계산       | partial     |
| [[claim]]         | 취소/반품/교환 클레임 — 타입별 상태 전이, 거부 복원         | partial     |
| [[quote-request]] | 대량 견적 요청 — B2B, 단방향 전이, 클레임 시스템 외부       | implemented |
| [[design]]        | AI 디자인 생성 — 토큰 차감/환불, 멀티턴 대화                | implemented |
| [[cart]]          | 장바구니 — 회원/비회원, 로그인 동기화, reform 아이템        | implemented |

---

## 정책 문서 (`policies/`)

| 문서             | 설명                                           | 영향 도메인                        | 상태        |
| ---------------- | ---------------------------------------------- | ---------------------------------- | ----------- |
| [[payment]]      | Toss 결제 흐름, 멱등성, 실패 복구, 에러 코드   | sale, repair, custom-order, design | implemented |
| [[coupon]]       | 쿠폰 할인 계산, 생명주기, max_discount_amount  | sale, repair, custom-order         | implemented |
| [[token]]        | 토큰 원장, 구매 패키지, 소비 단가, 동시성 제어 | design                             | implemented |
| [[notification]] | 알림 이벤트 정의, 채널 후보 (향후 구현 예정)   | 전체                               | planned     |

---

## QA 시나리오 (`qa/`)

| 파일                 | 시나리오 수 |
| -------------------- | ----------- |
| [[qa/sale]]          | 23          |
| [[qa/repair]]        | 12          |
| [[qa/custom-order]]  | 14          |
| [[qa/claim]]         | 15          |
| [[qa/quote-request]] | 8           |
| [[qa/design]]        | 9           |
| [[qa/cart]]          | 7           |

---

## AI 참조 가이드

### 코드 생성 전 확인 순서

1. **해당 도메인 문서** (`domains/{domain}.md`) — 경계·상태 전이·비즈니스 규칙
2. **횡단 정책** (`policies/payment.md`, `policies/coupon.md` 등) — 해당되는 경우
3. **CLAUDE.md 하드 가드레일** — 항상

### 상태 전이 코드 작성 시

- `domains/{domain}.md`의 **순방향**, **롤백**, **전이 불가** 테이블을 모두 확인
- 롤백 전이는 `is_rollback=true` + `memo` 필수
- 전이 불가 상태에서의 처리를 명시적으로 에러 처리

### 새 RPC 작성 시

- `SECURITY INVOKER`를 기본으로, RLS 우회 필요 시에만 `SECURITY DEFINER` + 주석
- `auth.uid()` 소유권 검증 포함 필수
- 금액 계산은 서버 측 RPC에서만

### 도메인 간 의존 관계

```
cart ──────────────────────────▶ sale (주문 진입점)
cart ──────────────────────────▶ repair (reform 아이템)
sale, repair, custom-order ───▶ payment (결제 흐름)
sale, repair, custom-order ───▶ coupon (할인 적용)
sale, repair, custom-order ◀──▶ claim (취소/반품/교환)
design ────────────────────────▶ token (토큰 소비)
design ────────────────────────▶ payment (토큰 구매 결제)
```
