---
domain: cart
last-verified: 2026-03-17
---

# Cart QA 시나리오

### SC-cart-001: 비회원 장바구니 추가 [high]

**Given** 로그인하지 않은 상태에서 상품 상세 페이지에 접근한 상태
**When** 장바구니 담기 버튼을 클릭한다
**Then** 로컬스토리지에 상품이 저장되고 장바구니에 표시된다

- 경로: store `/shop/:id`
- BR: BR-cart-001

---

### SC-cart-002: 로그인 시 로컬 장바구니 서버 동기화 [critical]

**Given** 비회원으로 장바구니에 상품을 담은 상태에서 로그인한 상태
**When** 로그인이 완료된다
**Then** 로컬 장바구니 상품이 서버 장바구니로 동기화(덮어쓰기)되고 로컬스토리지가 삭제된다

- 경로: store (로그인 플로우)
- BR: BR-cart-004

---

### SC-cart-003: 로그인 시 로컬 없으면 서버 장바구니 유지 [high]

**Given** 로컬스토리지 장바구니가 비어 있는 상태에서 로그인한 상태
**When** 로그인이 완료된다
**Then** 기존 서버 장바구니가 그대로 유지된다

- 경로: store (로그인 플로우)
- BR: BR-cart-004

---

### SC-cart-004: 동일 상품 중복 담기 방지 [high]

**Given** store 장바구니에 특정 상품이 이미 담긴 상태
**When** 동일 상품(동일 item_id)을 다시 담기 시도한다
**Then** 중복 추가되지 않고 수량으로 관리된다

- 경로: store `/cart`
- BR: BR-cart-003

---

### SC-cart-005: 수량 변경 [high]

**Given** store 장바구니(`/cart`)에 상품이 담긴 상태
**When** 수량을 변경한다
**Then** 변경된 수량과 금액이 반영된다

- 경로: store `/cart`
- BR: BR-cart-008

---

### SC-cart-006: 상품 삭제 [high]

**Given** store 장바구니(`/cart`)에 상품이 담긴 상태
**When** 상품을 선택하고 삭제한다
**Then** 해당 상품이 장바구니에서 제거된다

- 경로: store `/cart`
- BR: BR-cart-006

---

### SC-cart-007: 로그아웃 시 게스트 장바구니로 전환 [medium]

**Given** 회원으로 로그인하여 장바구니를 사용 중인 상태
**When** 로그아웃한다
**Then** 이전 사용자 캐시가 정리되고 로컬스토리지 장바구니로 전환된다

- 경로: store (로그아웃 플로우)
- BR: BR-cart-005
