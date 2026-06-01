# AGENTS

## Hard Rules

- 워크트리 미사용
- AI 임의 commit/MR 금지 (사용자 명시 요청 시만)
- BFF/서버 서비스 계층 없음 — 프론트 API 레이어가 Supabase 직접 호출
- 이미지 저장소는 ImageKit만 — Supabase Storage 사용 금지 (예외는 사전 승인 + `docs/policies` 업데이트)
- 금액 계산은 RPC 서버 측에서만 (상세: `docs/policies/payment.md`)
- 마이그레이션은 `pnpm db:new`로만 생성 — 직접 생성·임의 타임스탬프 금지
- 원격 push된 마이그레이션 수정 금지 — 변경은 새 마이그레이션으로
- 테스트 실패 시 반환값·mock·테스트 코드 수정 금지 — 로직 버그 신호로 간주, 통과 우선 작업 금지

## 타입·매핑

- UI 타입(화면 모델)과 DTO(RPC 입출력) 분리. 매핑은 **API 계층에서만**
- `packages/shared/src/mappers/`는 API 계층에서만 호출 — 컴포넌트·훅 직접 호출 금지
- 한 타입에 `product`와 `product_id` 동시 사용 금지 (중복 참조 방지)
- 매퍼에서 `as` 남용 금지 — 구별된 유니언 좁히기 사용

## 프론트엔드

- API 파일(`*-api.ts`)은 얇게. 매핑은 `*-mapper.ts`로 분리
- Figma는 디자인 의도 참고용으로 사용하고, 수치·사이즈를 그대로 복사하지 않음
- 기존 컴포넌트 재사용 시 스타일 오버라이드는 금지. 가능한 기본 props와 기본 사이즈를 유지
- 디자인 의도가 명확해 기존 컴포넌트 확장이 필요하면, 임의 className 오버라이드 대신 새 props 추가 여부를 사용자에게 먼저 확인
- 관리자 화면 정보 위계는 `페이지 제목 → 페이지 설명 → 카드 제목 → 카드 내용` 순서를 기본으로 한다.
- 카드 밖 title/subtitle은 페이지 정체성과 전체 설명만 담당한다.
- 카드 안 title은 실제 관리 단위나 목록 단위를 나타낸다. 카드 안 subtitle은 설정 폼처럼 추가 설명이 필요한 경우에만 사용하고, 목록 카드에는 반복 설명을 넣지 않는다.
- 개수는 title 문자열의 괄호가 아니라 title 옆 badge/chip으로 분리한다.
- 오류, 미저장 변경, 로딩 같은 상태 안내는 카드 subtitle이 아니라 해당 탭·컨트롤·상태 표시 근처의 범례나 보조 상태 텍스트로 둔다.

## DB 접근

- 새 쓰기 RPC는 `auth.uid()` 소유권 검증 포함, `SECURITY INVOKER` 기본
- `SECURITY DEFINER` 필요 시 함수에 `COMMENT ON FUNCTION`으로 사유 기록
- 직접 테이블 쓰기는 `cart_items` DELETE만 허용 (RLS `user_id = auth.uid()` 보장)
- 다른 예외는 RLS 근거 명시 필수

## 로컬 개발 환경

- cloud 프로파일(`apps/<app>/.env.supabase.cloud`)은 수동 생성 필요 — 없으면 `env:supabase:cloud` 전환 불가
- `db:reset` seed 순서: `00_reference_snapshot.sql`(운영 스냅) → `10_dev_auth.sql`(계정) → `20_dev_fixture.sql`(픽스처)
- 운영 스냅(`00_reference_snapshot.sql`)은 자동 갱신 안 됨 — 상품·가격·어드민 설정 변경 시 `db:seed:pull-reference --cloud` 수동 실행
- 로컬 결제 테스트: `supabase/.env.local`에 `TOSS_SECRET_KEY=test_sk_...` 설정
- Edge Function serve 대상은 sandbox로 실제 플로우 검증 가능한 것만 — `confirm-payment`, `cancel-token-payment`, `create-order` 계열. SMS·ImageKit 계열은 로컬 serve 안 함

## Supabase 운영

- `supabase/schemas/*.sql`이 DB 구조 기준
- 운영 DB 객체 변경 시 `supabase/schemas/*.sql` 변경과 새 `supabase/migrations/*.sql`을 같은 diff에 포함
- CLI 실패 시 에러 전문 공유, 자동 재시도 금지
- `migration repair`, `db reset --linked`는 영향 범위 설명 후 승인받고 실행
- 마이그레이션 파일에 `--` 주석 금지 (squash 시 소실) → `supabase/schemas/*.sql` 또는 `COMMENT ON` 사용
- `DROP CONSTRAINT/INDEX`의 `IF EXISTS`는 허용. 원격 적용 여부 불명확한 마이그레이션 수정해 제거하지 않음
- 마이그레이션 수정·삭제·squash 전 `supabase migration list`로 Remote 존재 확인. 확인 없으면 적용된 것으로 간주

## 문서 지도

| 종류           | 위치                                      |
| -------------- | ----------------------------------------- |
| 도메인 스펙    | `docs/domains/{domain}.md`                |
| 횡단 정책      | `docs/policies/{payment,coupon,token}.md` |
| QA 시나리오    | `docs/qa/{domain}.md`                     |
| 앱별 규칙      | `apps/{app}/AGENTS.md`                    |
| 상태 전이 규칙 | `docs/domains/{domain}.md`                |
