# 알림 정책 (Notification Policy)

## 1. 개요

- **구현 상태**: 미구현
- **적용 범위**: 주문/클레임/견적 상태 변경 시 사용자 알림 (향후 구현 예정)

---

## 2. 향후 필요 알림 시점

### 주문 알림

| 이벤트 | 대상 | 우선순위 |
|--------|------|---------|
| 결제 완료 | 고객 | 높음 |
| 주문 상태 변경 (배송중, 배송완료) | 고객 | 높음 |
| 구매확정 (수동/자동) | 고객 | 낮음 |
| 주문 취소 완료 | 고객 | 높음 |

### 클레임 알림

| 이벤트 | 대상 | 우선순위 |
|--------|------|---------|
| 클레임 접수 확인 | 고객 | 높음 |
| 클레임 상태 변경 | 고객 | 높음 |
| 클레임 거부 | 고객 | 높음 |
| 클레임 완료 | 고객 | 높음 |

### 견적 요청 알림

| 이벤트 | 대상 | 우선순위 |
|--------|------|---------|
| 견적 발송 | 고객 | 높음 |
| 견적 확정 | 고객 | 높음 |

### 토큰 알림

| 이벤트 | 대상 | 우선순위 |
|--------|------|---------|
| 토큰 구매 완료 | 고객 | 중간 |
| 토큰 잔액 부족 | 고객 | 낮음 |

---

## 3. 알림 채널 후보

| 채널 | 설명 |
|------|------|
| 앱 푸시 | 모바일 앱 푸시 알림 |
| 이메일 | 거래 확인 이메일 |
| SMS | 중요 상태 변경 문자 |
| 인앱 알림 | 웹/앱 내 알림 센터 |

---

## 4. 구현 시 고려사항

- **알림 발송 시점**: 주문 상태 변경 RPC 또는 Edge Function에서 트리거
- **Edge Function 방식 권장**: 외부 알림 서비스(이메일, SMS) 호출은 Edge Function에서 처리 (Supabase 함수 선택 기준 참조)
- **중복 발송 방지**: 알림 이력 테이블 + 멱등 키 필요
- **사용자 수신 설정**: 알림 타입별 on/off 설정 지원 필요

---

## 5. 관련 프로세스

- [sale-process.md](../processes/sale-process.md)
- [repair-process.md](../processes/repair-process.md)
- [custom-order-process.md](../processes/custom-order-process.md)
- [claim-process.md](../processes/claim-process.md)
- [quote-request-process.md](../processes/quote-request-process.md)
- [design-process.md](../processes/design-process.md)
