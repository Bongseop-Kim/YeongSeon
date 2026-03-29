---
domain: claim
last-verified: 2026-03-29
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

### SC-claim-016: sale 주문 완료 상태에서 반품/교환 버튼 미노출 [critical]

**Given** store `/order/:orderId`에서 sale 주문이 완료 상태인 상태
**When** 주문 상세 페이지를 조회한다
**Then** 반품/교환 버튼이 표시되지 않는다

- 경로: store `/order/:orderId`
- BR: BR-claim-002 (sale 완료 상태에서 클레임 불가)
- 검증 포인트: get_order_customer_actions SQL에서 sale/완료 시 claim_return, claim_exchange 미포함

---

### SC-claim-017: 완료된 클레임 후 동일 상품 재신청 불가 [critical]

**Given** admin이 반품 클레임을 완료 처리한 상태
**When** 고객이 동일한 주문 상품에 대해 반품 클레임을 다시 신청한다
**Then** 클레임 생성이 거부된다

- 경로: store `/order/claim/:type/:orderId/:itemId`
- BR: 완료는 최종 상태이므로 동일 상품 재신청 불가
- 검증 포인트: create_claim의 중복 체크가 완료 상태도 포함하는지 확인

---

### SC-claim-018: 수거완료 상태에서 롤백 버튼 명시적 미노출 [critical]

**Given** admin `/claims/show/:id`에서 반품 클레임이 수거완료 상태인 상태
**When** 클레임 상세 페이지를 조회한다
**Then** 롤백 버튼이 표시되지 않는다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-006 (수거완료는 롤백 불가)

---

### SC-claim-019: 재발송 상태에서 롤백 버튼 명시적 미노출 [critical]

**Given** admin `/claims/show/:id`에서 교환 클레임이 재발송 상태인 상태
**When** 클레임 상세 페이지를 조회한다
**Then** 롤백 버튼이 표시되지 않는다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-006 (재발송은 롤백 불가)

---

### SC-claim-020: 거부 상태에서 memo 없이 복원 시도 [critical]

**Given** admin `/claims/show/:id`에서 클레임이 거부 상태인 상태
**When** memo 없이 접수로 복원을 시도한다
**Then** 사유 입력이 필수라는 안내가 표시되고 복원이 처리되지 않는다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-005

---

### SC-claim-021: repair 주문 대기중 상태에서 취소 신청 가능 [high]

**Given** store `/order/:orderId`에서 repair 주문이 대기중 상태인 상태
**When** 취소 버튼을 클릭한다
**Then** 취소 클레임이 접수된다

- 경로: store `/order/:orderId`
- BR: BR-claim-003 (repair 대기중: cancel만 가능)

---

### SC-claim-022: repair 주문 배송완료 상태에서 반품/교환 신청 가능 [high]

**Given** store `/order/:orderId`에서 repair 주문이 배송완료 상태인 상태
**When** 반품/교환 버튼을 클릭한다
**Then** 반품/교환 클레임이 접수된다

- 경로: store `/order/:orderId`
- BR: BR-claim-003

---

### SC-claim-023: sample 주문 접수 상태에서 취소 신청 가능 [high]

**Given** store `/order/:orderId`에서 sample 주문이 접수 상태인 상태
**When** 취소 버튼을 클릭한다
**Then** 취소 클레임이 접수된다

- 경로: store `/order/:orderId`
- BR: BR-claim-009

---

### SC-claim-024: sample 주문 배송완료 상태에서 반품/교환 버튼 미노출 [high]

**Given** store `/order/:orderId`에서 sample 주문이 배송완료 상태인 상태
**When** 주문 상세 페이지를 조회한다
**Then** 반품/교환 버튼이 표시되지 않는다

- 경로: store `/order/:orderId`
- BR: BR-claim-007, BR-claim-009

---

### SC-claim-015: admin 거부 → 접수 복원 [high]

**Given** admin `/claims/show/:id`에서 클레임이 거부 상태인 상태
**When** 접수로 복원한다
**Then** 접수로 복원된다

- 경로: admin `/claims/show/:id`
- BR: BR-claim-005
