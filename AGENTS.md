## Git

- 워크트리 미사용.
- AI는 커밋·MR을 임의 실행하지 않는다. 명시적 요청 시에만.

## Codex 위임

- 코드 생성·수정·버그 수정은 Codex에 위임.
- Claude는 설계 판단, 리뷰, 아키텍처 의사결정, 한두 줄 trivial 변경만.
- Codex 위임 전 작업 범위·모델 선택 판단은 Claude가.

## 서브에이전트 모델 선택

**gpt-5.4 (기본값)** — 멀티파일, 탐색/계획/디버그, 추론 필요 작업, 로직·보안·아키텍처 리뷰.

**gpt-5.3-codex-spark** — 단일 파일 범위의 빠른 작업: 스타일 튜닝, UI 반복, 스니펫, 타겟 에디트, 단순 리팩터링, 포맷·네이밍·오타 리뷰.

애매하면 gpt-5.4.

## 비자명한 명령어

```bash
pnpm db:new        # 마이그레이션 파일 생성 (remote+local 최신 타임스탬프 자동 계산)
supabase functions deploy <function-name> --use-api   # 단일 Edge Function을 Docker 없이 서버 측 번들링으로 배포
```

## 하드 가드레일

**아키텍처**

- 별도 BFF/서버 서비스 계층 없음. 프론트 API 레이어가 Supabase를 직접 호출.

**타입·매핑**

- UI 타입(화면 모델)과 DTO(RPC 입출력)는 분리. 매핑은 API 계층에서만.
- `packages/shared/src/mappers/`는 API 계층에서만 호출. 컴포넌트·훅 직접 호출 금지.
- 하나의 타입에 `product`와 `product_id` 동시 사용 금지 (중복 참조 방지).

**도메인 로직**

- 금액 계산은 RPC 서버 측에서만. 상세는 `docs/policies/payment.md`.
- 상태 전이 규칙은 `docs/domains/{domain}.md` 참조.

**DB 접근**

- 새 쓰기 RPC는 `auth.uid()` 소유권 검증 포함, `SECURITY INVOKER` 기본.
- `SECURITY DEFINER`가 필요하면 함수에 `COMMENT ON FUNCTION`으로 사유 기록.
- 직접 테이블 쓰기는 `cart_items` DELETE만 허용 (RLS `user_id = auth.uid()` 보장). 다른 예외는 RLS 근거 명시 필수.

## 문서 지도

- 도메인 스펙: `docs/domains/{domain}.md`
- 횡단 정책: `docs/policies/{payment,coupon,token}.md`
- QA 시나리오: `docs/qa/{domain}.md`
- 앱별 규칙: `apps/{app}/AGENTS.md` (e.g., `apps/store/AGENTS.md`)

## 프론트엔드

- API 파일(`*-api.ts`)은 얇게. 매핑은 `*-mapper.ts`로 분리.
- 매퍼에서 `as` 남용 대신 구별된 유니언 좁히기.

## Supabase

- `supabase/schemas/*.sql`이 DB 구조 기준.
- 마이그레이션 파일은 반드시 `pnpm db:new`로 생성. 직접 생성·임의 타임스탬프 금지.
- 원격에 push된 마이그레이션은 수정하지 않는다. 변경은 새 마이그레이션으로.
- 마이그레이션 수정/삭제/squash 전 `supabase migration list`로 Remote 존재 확인. 확인 없으면 이미 적용된 것으로 간주.
- CLI 실패 시 에러 전문 그대로 공유, 자동 재시도 금지.
- `migration repair`, `db reset --linked`는 영향 범위 설명 후 승인받고 실행.
- 마이그레이션 파일에 `--` 주석 금지 (squash 시 소실). 설명은 `supabase/schemas/*.sql` 또는 `COMMENT ON`으로.
- `DROP CONSTRAINT/INDEX`의 `IF EXISTS`는 허용. 원격 적용 여부가 불명확한 마이그레이션을 수정해 제거하지 않는다.

## 테스트

- 테스트 실패는 로직 버그의 신호다. 테스트를 통과시키려고 반환값·mock·테스트 코드를 수정하지 않는다.
- 테스트 자체가 잘못되었다고 판단되면 중단하고 사용자에게 보고한다.
