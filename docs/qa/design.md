---
domain: design
last-verified: 2026-03-17
---

# Design QA 시나리오

### SC-design-001: 토큰 잔액 표시 [high]

**Given** store 디자인 생성 페이지(`/design`)에 접근하는 상태
**When** 페이지에 진입한다
**Then** 현재 토큰 잔액이 표시된다

- 경로: store `/design`
- BR: BR-design-001

---

### SC-design-002: 텍스트 생성 요청 [critical]

**Given** store `/design`에서 텍스트 옵션을 설정하고 충분한 토큰이 있는 상태
**When** 생성 버튼을 클릭한다
**Then** 생성 중 표시 후 결과 텍스트가 표시되고 토큰이 차감된다

- 경로: store `/design`
- BR: BR-design-001

---

### SC-design-003: 이미지 포함 생성 요청 [critical]

**Given** store `/design`에서 text_and_image 옵션을 선택하고 충분한 토큰이 있는 상태
**When** 생성 버튼을 클릭한다
**Then** 생성 중 표시 후 텍스트와 이미지 결과가 표시된다

- 경로: store `/design`
- BR: BR-design-001

---

### SC-design-004: 토큰 부족 시 생성 시도 [critical]

**Given** store `/design`에서 토큰 잔액이 0인 상태
**When** 생성 버튼을 클릭한다
**Then** 생성 불가 안내가 표시된다

- 경로: store `/design`
- BR: BR-design-002

---

### SC-design-005: 환불 대기 중 생성 시도 [critical]

**Given** store `/design`에서 환불 요청이 pending 상태인 상태
**When** 생성 버튼을 클릭한다
**Then** 생성 불가 안내가 표시된다

- 경로: store `/design`
- BR: BR-design-002

---

### SC-design-006: 토큰 내역 조회 [medium]

**Given** 토큰 사용/충전/환불 이력이 있는 상태
**When** store 토큰 내역 페이지(`/my-page/token-history`)에 접근한다
**Then** 사용/충전/환불 이력이 표시된다

- 경로: store `/my-page/token-history`
- BR: BR-design-001

---

### SC-design-007: 토큰 환불 신청 [high]

**Given** store `/design`에서 AI 생성 결과 화면에 있고 paid 토큰이 미사용분으로 있는 상태
**When** 환불 신청을 한다
**Then** 환불 요청이 접수된다

- 경로: store `/design`
- BR: BR-design-005

---

### SC-design-008: 동일 주문 환불 중복 신청 시도 [high]

**Given** store에서 이미 pending 환불 요청이 있는 상태
**When** 동일 주문으로 다시 환불 신청을 한다
**Then** 중복 신청 불가 안내가 표시된다

- 경로: store `/design`
- BR: BR-design-006

---

### SC-design-009: 신규 가입 시 무료 토큰 지급 [high]

**Given** 신규 계정을 생성한 상태
**When** store 디자인 생성 페이지(`/design`)에 진입한다
**Then** 토큰 잔액이 30개로 표시된다

- 경로: store `/design`
- BR: BR-design-007
