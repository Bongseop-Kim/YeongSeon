# 릴리즈 노트 — 2026-02-20 ~ 2026-02-21

> 대상 브랜치: `main-merge`
> 커밋 범위: `b07a52b..2f68ea0` (16 커밋, 113 파일, +5 493 / −1 365)

---

## 신규 기능

### 주문제작 주문하기 (`2f68ea0`)
- 로그인 체크 → 배송지 선택 → ImageKit 이미지 업로드 → DB 저장 → 성공 토스트 + 주문 목록 이동
- `custom_orders` 테이블 + `create_custom_order_txn` RPC 마이그레이션
- `imagekit-auth` / `create-custom-order` Edge Function 배포
- `ImageKitProvider`에 `publicKey` 연결

### 클레임(취소/반품/교환) 백엔드 (`5f85b80`)
- `claims` 테이블 + RLS + `create_claim()` RPC + `claim_list_view` 마이그레이션
- DTO/Mapper/Query 계층 추가, 더미 데이터 → Supabase 실연결
- 취소 내역 목록/신청 페이지 로딩·에러·빈 상태 처리

### 문의하기 백엔드 (`4b936b3`)
- `inquiries` 테이블 마이그레이션 (RLS: 답변대기 상태만 수정·삭제 허용)
- DTO/Mapper/API/Query 계층 추가
- 더미 데이터 제거, Supabase CRUD 실연결

### 이메일 변경 인증 플로우 (`8d0dadb`)
- email-api / email-query 추가
- 이메일 변경 페이지 인증 플로우 연결

### 마케팅 수신 동의 저장 (`e91cdcf`)
- profile-api 확장, notice 페이지 Supabase 연동

### 회원탈퇴 플로우 (`9f360dc`)
- `delete-account` Edge Function (JWT 검증 → admin.deleteUser)
- `user_coupons` FK에 ON DELETE CASCADE 마이그레이션
- Leave 페이지 UI: 비밀번호 입력 제거 → 동의 체크 + 확인 모달

### 주문/클레임 목록 검색 필터 (`5a112f6`)
- 주문 목록 + 취소 내역에 키워드·날짜 필터 연결
- `useDebouncedValue` 훅 추가

### 미지원 로그인 공급자 비활성 (`bf52fb1`)
- 로그인 페이지에서 미지원 OAuth 공급자 버튼 비활성 처리

---

## 리팩터링

### 장바구니 책임 분리 (`92e67c4`, `5671de2`)
- `CartPage` → `cart-items-panel` 분리
- `useCart` → `cart-item-operations` + `cart-sync` 분리
- 단위 테스트 추가 (`cart-sync.test.ts`, `cart-page.test.ts`)

### 주문/카트 금액 계산 단일화 (`009a773`)
- 할인·쿠폰 금액 계산 함수 통합

### 상품상세 안정화 (`266808a`)
- non-null assertion (`!`) 제거, 옵션 분기 안전 처리

### 주문 상세 쿼리 정리 (`9ca59d1`)
- 주문 상세 페이지 query 상태·액션 최종 정리

---

## 인프라 / 코드 품질

### Vitest 도입 (`9e137cf`)
- Vitest + coverage-v8 설정, 기존 `node:test` 마이그레이션
- 순수 함수 테스트 40건 추가
- 공유 fixture 팩토리 패턴 도입
- GitHub Actions CI 파이프라인 추가

### 절대경로 import 강제 (`ce63aaa`)
- ESLint 규칙 추가, 기존 상대경로 위반 제거

### Supabase MCP 서버 설정 (`c3261b5`)
- Claude Code에서 Supabase 직접 접근 가능

---

## 영향받는 주요 경로

| 경로 | 관련 커밋 |
|------|-----------|
| 로그인 | `bf52fb1` |
| 상품 상세 | `266808a` |
| 장바구니 | `92e67c4`, `5671de2`, `009a773` |
| 주문서 작성 | `009a773` |
| 주문 목록 | `5a112f6` |
| 주문 상세 | `9ca59d1` |
| 취소 내역 / 클레임 신청 | `5f85b80`, `5a112f6` |
| 주문제작 | `2f68ea0` |
| 마이페이지 > 이메일 변경 | `8d0dadb` |
| 마이페이지 > 마케팅 수신 | `e91cdcf` |
| 마이페이지 > 회원탈퇴 | `9f360dc` |
| 마이페이지 > 문의하기 | `4b936b3` |

---

## DB 마이그레이션 목록

| 파일 | 내용 |
|------|------|
| `20260220120000_create_claims_system.sql` | claims 테이블 + RPC + 뷰 |
| `20260220130000_create_inquiries_system.sql` | inquiries 테이블 |
| Supabase MCP 적용 | `custom_orders` 테이블 + RPC |

## Edge Function 목록

| 함수 | 메서드 | 용도 |
|------|--------|------|
| `create-order` | POST | 기존 주문 생성 |
| `create-custom-order` | POST | 주문제작 생성 |
| `imagekit-auth` | GET | ImageKit 업로드 인증 |
| `delete-account` | POST | 회원 탈퇴 |
