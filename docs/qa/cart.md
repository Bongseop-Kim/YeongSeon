---
domain: cart
last-verified: 2026-03-29
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

---

### SC-cart-008: 로그인 시 로컬 장바구니 업로드 실패 — 로컬 카트 제거 후 서버 장바구니 사용 [high]

**Given** 비회원으로 장바구니에 상품 3개를 담은 상태
**When** 로그인하되 네트워크 오류로 replace_cart_items RPC가 실패한다
**Then** 토스트 오류 메시지가 표시되고 서버 장바구니가 표시된다. 로컬스토리지의 guest 아이템은 제거된다 (재로그인 재시도 루프 방지 — `useCartAuthSync.ts` catch 블록에서 `clearGuest()` 호출)

- 경로: store (로그인 플로우)
- BR: BR-cart-004

---

### SC-cart-009: 로그인 시 로컬 · 서버 동시 존재 → 로컬이 서버를 덮어씀 [critical]

**Given** 비회원 로컬 장바구니에 [item-A] 저장, 동일 계정 서버 장바구니에 [item-B] 존재
**When** 로그인이 완료된다
**Then** 서버 장바구니 [item-B]가 삭제되고 로컬 [item-A]로 덮어써진다 (병합 아님)

- 경로: store (로그인 플로우)
- BR: BR-cart-004 (덮어쓰기 정책 확인)

---

### SC-cart-010: 품절 상품이 장바구니에 있을 때 주문 진행 [high]

**Given** 장바구니에 정상 상품 2개 + 품절된 상품 1개가 담긴 상태
**When** 주문하기 버튼을 클릭한다
**Then** 품절 상품에 대한 명시적 안내가 표시되거나 자동 제외된다

- 경로: store `/cart`
- BR: 미정의 (정책 결정 필요)

---

### SC-cart-011: Reform + 일반 상품 혼합 주문 [medium]

**Given** 장바구니에 일반 상품 1개 + Reform 수선 아이템 1개가 담긴 상태
**When** 전체 선택 후 주문하기를 클릭한다
**Then** 일반 주문과 수선 주문이 각각 생성되고 배송비가 별도로 계산된다

- 경로: store `/cart`
- BR: BR-cart-002, BR-repair-007

---
