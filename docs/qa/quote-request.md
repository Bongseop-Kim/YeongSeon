---
domain: quote-request
last-verified: 2026-03-17
---

# Quote Request QA 시나리오

### SC-quote-001: 견적 요청 제출 [critical]

**Given** store 견적 요청 페이지에서 100개 이상 수량과 연락처를 입력한 상태
**When** 제출 버튼을 클릭한다
**Then** 요청 상태로 견적 요청 목록에 표시된다

- 경로: store 견적 요청 페이지
- BR: BR-quote-001

---

### SC-quote-002: 수량 100개 미만 제출 시도 [critical]

**Given** store 견적 요청 페이지에서 수량을 99개로 입력한 상태
**When** 제출 버튼을 클릭한다
**Then** 제출이 불가하고 오류 메시지가 표시된다

- 경로: store 견적 요청 페이지
- BR: BR-quote-001

---

### SC-quote-003: 연락처 미입력 제출 시도 [critical]

**Given** store 견적 요청 페이지에서 연락처 없이 다른 정보를 입력한 상태
**When** 제출 버튼을 클릭한다
**Then** 제출이 불가하고 오류 메시지가 표시된다

- 경로: store 견적 요청 페이지
- BR: BR-quote-002

---

### SC-quote-004: 고객 견적 요청 목록 조회 [medium]

**Given** 견적 요청을 제출한 상태
**When** store 견적 요청 목록 페이지(`/my-page/quote-request`)에 접근한다
**Then** 제출한 견적 요청이 표시된다

- 경로: store `/my-page/quote-request`
- BR: BR-quote-001

---

### SC-quote-005: 고객 상세 조회 (견적 발송 전) [high]

**Given** store `/my-page/quote-request/:id`에서 견적 요청이 요청 상태인 상태
**When** 상세 페이지를 조회한다
**Then** 견적 금액이 표시되지 않는다

- 경로: store `/my-page/quote-request/:id`
- BR: BR-quote-003

---

### SC-quote-006: admin 견적발송 처리 [critical]

**Given** admin `/quote-requests/show/:id`에서 견적 요청이 요청 상태인 상태
**When** 견적 금액을 입력하고 견적발송으로 처리한다
**Then** 견적발송 상태로 변경되고 금액이 저장된다

- 경로: admin `/quote-requests/show/:id`
- BR: BR-quote-004

---

### SC-quote-007: 고객 상세 조회 (견적 발송 후) [high]

**Given** store `/my-page/quote-request/:id`에서 견적 요청이 견적발송 상태인 상태
**When** 상세 페이지를 조회한다
**Then** 견적 금액이 표시된다

- 경로: store `/my-page/quote-request/:id`
- BR: BR-quote-003

---

### SC-quote-008: admin 협의중 → 확정 → 종료 순차 변경 [high]

**Given** admin `/quote-requests/show/:id`에서 견적 요청이 협의중 상태인 상태
**When** 확정, 종료 순으로 상태를 변경한다
**Then** 각 단계별로 상태가 순차적으로 변경된다

- 경로: admin `/quote-requests/show/:id`
- BR: BR-quote-005

---

### SC-quote-009: 단방향 전이 강제 — 역방향 시도 불가 [high]

**Given** admin `/quote-requests/show/:id`에서 견적 요청이 협의중 상태인 상태
**When** 상태를 견적발송(이전 상태)으로 변경하려 한다
**Then** 변경이 불가하고 UI 버튼이 표시되지 않거나 에러가 반환된다

- 경로: admin `/quote-requests/show/:id`
- BR: BR-quote-005 (모든 전이는 단방향, 롤백 불가)

---

### SC-quote-010: 연락처 방법 유효성 검증 [medium]

**Given** store 견적 요청 페이지에서 연락처 방법을 선택하는 상태
**When** 지원되지 않는 방법으로 제출을 시도한다
**Then** 제출이 불가하고 허용된 연락처 방법만 선택 가능하다

- 경로: store 견적 요청 페이지
- BR: BR-quote-002
