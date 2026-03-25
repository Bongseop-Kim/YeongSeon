# Language

Always respond in Korean.

## 빠른 시작

> 패키지 매니저는 **pnpm** 전용 (`npm`/`yarn` 사용 시 preinstall 훅에서 차단됨)

```bash
pnpm install

pnpm dev:store          # store 앱 개발 서버 (Vite)
pnpm dev:admin          # admin 앱 개발 서버
pnpm dev                # 전체 앱 동시 실행 (Turborepo)

pnpm test               # 전체 테스트 (Vitest)
pnpm type-check         # TypeScript 타입 검사
pnpm lint               # ESLint
pnpm build              # 전체 빌드

pnpm db:diff            # DB 스키마 diff
pnpm db:push            # 마이그레이션 push
supabase migration list # Remote 마이그레이션 목록 확인
supabase db push        # 마이그레이션 push (supabase CLI 직접)

# Edge Function 배포 (--use-api 필수: Docker 없이 서버 측 번들링을 강제하므로 CI나 Docker 미설치 환경에서 유용)
supabase functions deploy <함수명> --use-api
supabase functions deploy --use-api   # 전체 배포
```

새 feature 파일 위치: `apps/{app}/src/features/{domain}/api/{domain}-api.ts` + `{domain}-mapper.ts`
예시: `apps/my-app/src/features/orders/api/orders-api.ts` + `orders-mapper.ts`, `apps/web/src/features/user/api/user-api.ts` + `user-mapper.ts`

## 하드 가드레일

- 별도 BFF/서버 서비스 계층은 두지 않는다. 프론트 API 레이어가 Supabase(RPC/View/Table)를 직접 호출한다.
- UI 타입은 화면 모델, DTO는 RPC 입출력 모델로 분리한다.
- UI와 DTO 매핑은 API 계층에서만 수행한다. `packages/shared/src/mappers/`는 여러 앱에서 공통으로 사용하는 변환 유틸리티이며, API 계층 mapper에서 호출해 사용한다. 컴포넌트나 훅에서 직접 호출 금지.
- 새 RPC는 UI 타입을 직접 입력/출력으로 사용하지 않는다.
- 혼합 형태를 금지한다. (예: 하나의 타입에 `product`와 `product_id` 동시 사용 금지)
- 금액 계산은 RPC 서버 측에서만 수행한다. 쿠폰 캡 공식은 해당 RPC를 참조한다.
- 새 쓰기 경로는 반드시 `auth.uid()` 소유권 검증과 `SECURITY DEFINER/INVOKER` 명시를 포함한다. `SECURITY INVOKER`를 기본으로 하고, RLS를 우회해야 하는 특수 목적(예: audit log 작성)에만 `SECURITY DEFINER`를 사용한다. `SECURITY DEFINER` 사용 시 PR 설명에 이유를 기술한다.
- 직접 테이블 쓰기는 `cart_items` DELETE만 허용한다. 이 예외는 해당 테이블의 RLS 정책이 `user_id = auth.uid()`로 소유권을 보장하기 때문이다. 다른 테이블에 직접 쓰기 예외를 추가하려면 동일하게 RLS 근거를 명시해야 한다.
- 주문/클레임 상태 전이는 두 모드로 동작한다. `is_rollback=false`(기본): 순방향만 허용. `is_rollback=true`: 역방향 허용, 사유(memo) 필수. 배송중/완료/취소/수거완료/재발송 이후는 rollback 불가. **상태 전이 상세 규칙은 `docs/domains/{domain}.md` 참조** (순방향·롤백·전이 불가 테이블 포함).

## 문서 참조 규칙

- 도메인 스펙: `docs/domains/{domain}.md` — 경계·상태 전이·비즈니스 규칙의 단일 소스 오브 트루스
- 횡단 정책: `docs/policies/payment.md`, `docs/policies/coupon.md`, `docs/policies/token.md`
- QA 시나리오: `docs/qa/{domain}.md` — Given-When-Then 형식, E2E 테스트 생성 입력
- 문서 지도: `docs/README.md`

## AI 에이전트 규칙

- 커밋은 항상 사용자가 직접 한다. AI가 임의로 `git commit`을 실행하지 않는다. 명시적으로 커밋을 요청받은 경우에만 실행한다.

## 프론트엔드 규칙

- API 파일(`*-api.ts`)은 얇게 유지하고, 매핑은 `*-mapper.ts`로 분리한다.
- 매퍼에서 `as` 남용보다 구별된 유니언(`type`) 기반 좁히기를 우선한다.
- 런타임 검증 없이 non-null 단언(`!`)을 사용하지 않는다.
- import 경로: 절대 경로(`@/`)만 사용한다.
- 단, index.ts barrel re-export는 예외로 상대 경로 허용.
- 모달: 텍스트 confirm/alert → `useModalStore`; 폼·복잡한 UI → 로컬 `Dialog`. Zustand에 ReactNode 저장 금지. 훅은 상태만 반환하고 렌더링은 전용 컴포넌트(`*-modals.tsx`)가 담당한다.

## Supabase 작업 안전 규칙

- `supabase/schemas/*.sql`을 DB 구조의 기준으로 사용한다.
- 원격에 push된 마이그레이션 파일은 수정하지 않는다. 변경은 새 마이그레이션으로만 반영한다.
- 마이그레이션 파일 수정/삭제/squash 전 `supabase migration list`로 Remote 존재 여부를 먼저 확인한다. 확인 결과를 직접 보기 전까지는 기존 마이그레이션 파일을 절대 수정하지 않는다. 확인 없이 진행해야 하는 상황이라면 이미 적용된 것으로 간주하고 신규 마이그레이션으로만 처리한다.
- `db push`, `db pull`, `db diff`, `db reset` 실패 시 에러 전문을 그대로 공유한다. 요약/생략 금지.
- Supabase CLI 실패 후 자동 재시도하지 않는다.
- `migration repair`, `db reset --linked` 등 상태 변경 복구 명령은 영향 범위를 설명한 뒤 사용자 승인 후 실행한다.
- 마이그레이션 내 `DROP CONSTRAINT`, `DROP INDEX` 등은 이전 마이그레이션에서 해당 객체 생성이 보장되므로 `IF EXISTS`를 붙이지 않는다. 존재하지 않으면 에러로 감지되는 것이 올바르다.

## 테스트 규칙

- 실패한 테스트를 통과시키기 위해 테스트 파일을 수정하지 말 것
- 테스트가 실패하면 테스트가 아닌 비즈니스 로직을 수정할 것
- 테스트 자체가 잘못되었다고 판단되면 수정하지 말고 즉시 중단 후 사용자에게 보고할 것
- 반환값을 하드코딩하거나 테스트 대상 함수 자체를 mock하지 말 것
