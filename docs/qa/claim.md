---
domain: claim
last-verified: 2026-03-17
---

# Claim QA 시나리오

### SC-claim-001: 고객 취소 신청 [critical]

**Given** store `/order/:orderId`에서 주문이 취소 가능 상태(예: 진행중)인 상태
**When** 취소 요청을 한다
**Then** 클레임 목록에 접수 상태로 표시된다

- 경로: store `/order/:orderId`
- BR: BR-claim-001

---

### SC-claim-002: 고객 반품 신청 [critical]

**Given** store `/order/:orderId`에서 주문이 배송완료 상태인 상태
**When** 반품 요청을 한다
**Then** 클레임 목록에 접수 상태로 표시된다

- 경로: store `/order/:orderId`
- BR: BR-claim-007

---

### SC-claim-003: 고객 교환 신청 [critical]

**Given** store `/order/:orderId`에서 주문이 배송완료 상태인 상태
**When** 교환 요청을 한다
**Then** 클레임 목록에 접수 상태로 표시된다

- 경로: store `/order/:orderId`
- BR: BR-claim-007

---

### SC-claim-004: 클레임 목록 조회 [medium]

**Given** 클레임을 신청한 상태
**When** store 클레임 목록 페이지(`/order/claim-list`)에 접근한다
**Then** 신청한 클레임 카드가 표시된다

- 경로: store `/order/claim-list`
- BR: BR-claim-001

---

### SC-claim-005: admin 취소 처리중으로 변경 [critical]

**Given** admin `/claims/show/:id`에서 클레임이 접수 상태(취소)인 상태
**When** 처리중으로 상태를 변경한다
**Then** 처리중으로 변경된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-001

---

### SC-claim-006: admin 취소 완료 처리 [critical]

**Given** admin `/claims/show/:id`에서 클레임이 처리중 상태(취소)인 상태
**When** 완료로 상태를 변경한다
**Then** 완료로 변경된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-001

---

### SC-claim-007: admin 취소 처리중 → 접수 롤백 [critical]

**Given** admin `/claims/show/:id`에서 클레임이 처리중 상태(취소)인 상태
**When** memo를 입력하고 접수 상태로 롤백한다
**Then** 접수로 변경되고 memo 이력이 표시된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-001

---

### SC-claim-008: admin 반품 수거요청 [critical]

**Given** admin `/claims/show/:id`에서 클레임이 접수 상태(반품)인 상태
**When** 수거요청으로 상태를 변경한다
**Then** 수거요청으로 변경된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-001

---

### SC-claim-009: admin 반품 수거완료 [critical]

**Given** admin `/claims/show/:id`에서 클레임이 수거요청 상태인 상태
**When** 수거완료로 상태를 변경한다
**Then** 수거완료로 변경된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-001

---

### SC-claim-010: admin 반품 완료 [critical]

**Given** admin `/claims/show/:id`에서 클레임이 수거완료 상태(반품)인 상태
**When** 완료로 상태를 변경한다
**Then** 완료로 변경된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-001

---

### SC-claim-011: admin 교환 재발송 [critical]

**Given** admin `/claims/show/:id`에서 클레임이 수거완료 상태(교환)인 상태
**When** 재발송으로 상태를 변경한다
**Then** 재발송으로 변경된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-001

---

### SC-claim-012: admin 교환 완료 [critical]

**Given** admin `/claims/show/:id`에서 클레임이 재발송 상태인 상태
**When** 완료로 상태를 변경한다
**Then** 완료로 변경된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-001

---

### SC-claim-013: admin 수거완료 상태에서 롤백 버튼 미노출 [critical]

**Given** admin `/claims/show/:id`에서 클레임이 수거완료 상태인 상태
**When** 클레임 상세 페이지를 조회한다
**Then** 롤백 버튼이 표시되지 않는다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-006

---

### SC-claim-014: admin 클레임 거부 [high]

**Given** admin `/claims/show/:id`에서 클레임이 접수 상태인 상태
**When** 거부 처리를 한다
**Then** 거부로 변경된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-005

---

### SC-claim-015: admin 거부 → 접수 복원 [high]

**Given** admin `/claims/show/:id`에서 클레임이 거부 상태인 상태
**When** 접수로 복원한다
**Then** 접수로 복원된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-005
