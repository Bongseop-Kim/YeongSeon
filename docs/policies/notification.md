---
policy: notification
status: implemented
affects: [sale, repair, custom-order, sample, claim, quote-request]
last-verified: 2026-03-25
---

# 알림 정책 (Notification)

> 주문/클레임/견적 상태 변경 시 고객에게 알림 발송. 외부 API는 Solapi 사용.
> 알림 수신은 고객 동의 및 전화번호 인증을 전제로 한다.

## 외부 API

- **Solapi**: 알림톡 / SMS 발송
- 인증: API Key 방식 (`SOLAPI_API_KEY`, `SOLAPI_API_SECRET`)
- 레퍼런스: https://developers.solapi.com/references/authentication/api-key
- 기본 채널: 카카오 알림톡. 실패 시 Solapi 대체발송(SMS) 자동 폴백. 둘 다 실패하면 조용히 종료.

## 핵심 규칙

**PR-notification-001**: 알림 발송은 Edge Function에서만 처리한다. RPC 내부에서 직접 외부 API를 호출하지 않는다.

**PR-notification-002**: 알림 발송 실패가 주문/클레임 처리 흐름을 중단시켜서는 안 된다. 발송 실패는 로깅만 하고 진행한다.

**PR-notification-003**: 수신자 전화번호는 `profiles.phone` 기준으로 조회한다. 소셜 로그인 여부와 무관하게 동일 로직을 적용한다.

**PR-notification-004**: `profiles.notification_consent = true` 이고 `profiles.phone_verified = true` 인 경우에만 알림을 발송한다.

**PR-notification-005**: `profiles.notification_enabled = false` 이면 동의 여부와 무관하게 발송하지 않는다.

**PR-notification-006**: 국내 번호(010 등)만 지원한다. 해외 번호는 지원하지 않는다.

## 프로필 필드

`profiles` 테이블에 아래 필드가 필요하다.

| 필드                   | 타입         | 설명                              |
| ---------------------- | ------------ | --------------------------------- |
| `phone`                | text \| null | 전화번호 (010-XXXX-XXXX)          |
| `phone_verified`       | boolean      | 번호 인증 완료 여부               |
| `notification_consent` | boolean      | 개인정보 수집·알림 수신 동의 여부 |
| `notification_enabled` | boolean      | 알림 수신 on/off (기본 true)      |

## 인증 및 동의 흐름

### 구매 시 진입점

```text
구매 진행
  └─ notification_consent = true?
       ├─ Yes → 결제 진행 (알림 수신 설정 완료 상태)
       └─ No  → 개인정보 수집 동의 팝업 표시
                  ├─ 동의 안 함 → 알림 없이 결제 진행
                  └─ 동의      → 번호 인증 플로우
                                   ├─ phone_verified = true → consent 저장 → 결제 진행
                                   └─ phone_verified = false → 번호 입력 → 인증번호 발송 → 인증 완료
                                                                → phone_verified=true, notification_consent=true 저장
                                                                → 결제 진행
```

### 동의 팝업 문구

```text
주문 진행 상황을 문자/카카오톡으로 안내해드립니다.
이를 위해 휴대폰 번호를 수집합니다.

[동의하고 계속] [동의 없이 계속]
```

### 인증번호 발송 규칙

| 항목             | 규칙                        |
| ---------------- | --------------------------- |
| 유효시간         | 5분                         |
| 재전송 간격      | 1분에 1회                   |
| 일일 최대 재전송 | 5회                         |
| 번호 형식 검증   | 발송 전 국내 번호 형식 확인 |

### 번호 변경 시

- `phone` 변경 시 `phone_verified = false` 로 초기화
- 다음 구매 시 인증 흐름 재진행

### 알림 수신 on/off

- 마이페이지에서 `notification_enabled` 토글 가능
- off → on 시 재인증 불필요 (번호 변경이 없는 경우)
- 번호가 변경된 상태라면 on 전환 시 인증 먼저 요구

## 알림 이벤트

### 1. 결제 완료

| 항목        | 내용                               |
| ----------- | ---------------------------------- |
| 수신자      | 고객                               |
| 트리거      | `payment_completed`                |
| 구현        | `confirm-payment` Edge Function    |
| 대상 도메인 | sale, repair, custom-order, sample |

**도메인별 전이**

| 도메인       | 상태 전이           |
| ------------ | ------------------- |
| sale         | `결제중 → 진행중`   |
| repair       | `결제중 → 발송대기` |
| custom-order | `결제중 → 접수`     |
| sample       | `결제중 → 접수`     |

**메시지 예시**

```text
[영선] 주문이 완료되었습니다.
주문번호: {order_id}
결제금액: {amount}원
```

---

### 2. 견적 요청 접수

| 항목        | 내용                                 |
| ----------- | ------------------------------------ |
| 수신자      | 고객                                 |
| 트리거      | `create-quote-request` Edge Function |
| 구현        | `create-quote-request` Edge Function |
| 대상 도메인 | quote-request                        |

> 접수 확인 용도. 이후 관리자가 직접 연락처(이메일/카카오/전화)로 고객과 협의한다.

**메시지 예시**

```text
[영선] 견적 요청이 접수되었습니다.
담당자가 순차적으로 연락드리겠습니다.
```

---

### 3. 클레임 처리 결과

| 항목        | 내용                           |
| ----------- | ------------------------------ |
| 수신자      | 고객                           |
| 트리거      | `update_claim_status` RPC      |
| 구현        | `notify-claim` Edge Function   |
| 발송 시점   | `→ 완료` 또는 `→ 거부` 전이 시 |
| 대상 도메인 | claim                          |

**완료 메시지 예시**

```text
[영선] 클레임이 처리 완료되었습니다.
처리 유형: {claim_type}
```

**거부 메시지 예시**

```text
[영선] 클레임 요청이 거부되었습니다.
자세한 내용은 앱에서 확인해주세요.
```

---

## 구현 위치

| 이벤트           | 트리거                       | 구현                                                  |
| ---------------- | ---------------------------- | ----------------------------------------------------- |
| 결제 완료        | `payment_completed`          | `supabase/functions/confirm-payment/index.ts`         |
| 견적 요청 접수   | `create-quote-request` 호출  | `supabase/functions/create-quote-request/index.ts`    |
| 클레임 처리 결과 | `update_claim_status` RPC    | `supabase/functions/notify-claim/index.ts`            |
| 인증번호 발송    | `send_phone_verification` UI | `supabase/functions/send-phone-verification/index.ts` |
| 번호 인증 완료   | `verify_phone` UI            | `supabase/functions/verify-phone/index.ts`            |

> 견적/클레임 알림은 RPC 내부에서 Edge Function을 호출하거나 DB webhook으로 트리거한다.

## 횡단 참조

- [[sale]], [[repair]], [[custom-order]], [[sample]] — 결제 완료 알림
- [[claim]] — 클레임 처리 결과 알림
- [[quote-request]] — 견적 요청 접수 알림
