# CLAUDE.md

## 목표

코드베이스를 **UI/DTO 분리 패턴**으로 표준화한다.

## Supabase 워크플로우 전략

### 선언형 스키마 (단일 진실 공급원)

- **`supabase/schemas/*.sql`** = 현재 DB 구조의 단일 진실 공급원.
- 현재 테이블/뷰/함수/RLS를 확인하려면 `schemas/` 폴더만 읽으면 됨.

### 스키마 파일 번호 규칙

| 범위    | 도메인                              |
| ------- | ----------------------------------- |
| `00-09` | 타입, 확장, 공통 트리거 함수        |
| `10-19` | auth.users에만 의존 (profiles 등)   |
| `20-29` | 상품 도메인                         |
| `30-39` | 쿠폰 도메인                        |
| `40-49` | 장바구니                            |
| `50-59` | 주문                                |
| `60-69` | 클레임                              |
| `70-79` | 문의                                |
| `80-89` | 독립 도메인 + 뷰 헬퍼 함수         |
| `90-99` | 뷰, RPC/비즈니스 함수              |

### 스키마 파일에 포함하는 것

- CREATE TABLE / TYPE / SEQUENCE
- ALTER TABLE ... ENABLE ROW LEVEL SECURITY
- CREATE POLICY / INDEX / TRIGGER / VIEW / FUNCTION

### 스키마 파일에 포함하지 않는 것

- GRANT / REVOKE (마이그레이션에 유지)
- DML (INSERT 시드 데이터)

### 마이그레이션 불변 규칙 (최우선)

> **원격에 push된 마이그레이션 파일은 절대 수정하지 않는다.**

이 규칙은 무조건적이며 예외가 없다.

- `supabase migration list`에서 Remote 열에 표시되는 마이그레이션은 **불변(immutable)** 이다.
- 버그 수정, 오타 교정, 리팩터링 등 어떤 이유든 push된 마이그레이션 파일을 편집하지 않는다.
- push된 마이그레이션의 변경이 필요하면 **새 마이그레이션 파일을 생성**하여 적용한다.
- `schemas/*.sql` 수정 후 `db diff -f <name>`으로 새 마이그레이션을 생성하는 경로를 기본으로 사용한다.
- 단, `GRANT/REVOKE`, 운영 복구용 DML 등 `schemas` 비포함 항목은 새 마이그레이션에서 직접 다룬다.

**push 전 로컬에만 있는 마이그레이션은 수정/삭제/squash 가능.**

**위반 시 발생하는 문제:**
push된 마이그레이션을 수정하면 로컬 파일 내용과 원격 적용 이력이 불일치하여,
이후 `db diff`마다 phantom drift(유령 차이)가 발생하고
매번 불필요한 싱크 작업과 재배포가 필요해진다.

### 마이그레이션 수정 전 필수 확인 절차

마이그레이션 파일을 수정·삭제·squash하기 **전에** 반드시 다음을 실행한다:

```bash
supabase migration list
```

출력 예시:
```
 Local          | Remote         | Time (UTC)
----------------|----------------|---------------------
 20260224135231 | 20260224135231 | 2026-02-24 13:52:31   ← Remote 있음 = 불변
 20260225002353 |                |                       ← Remote 없음 = 수정 가능
```

- **Remote 열에 타임스탬프가 있는 파일** → 불변. 절대 수정하지 않는다.
- **Remote 열이 비어 있는 파일** → 로컬 전용. 수정/삭제/squash 가능.

이 확인 없이 마이그레이션 파일을 편집하는 것은 금지한다.

### 변경 워크플로우

```text
schemas/*.sql 수정 → db diff -f <name> → db reset → commit → (쌓이면) migration squash → db push
```

- `migration squash`는 **프로덕션 push 전**에만 실행. push 후에는 원격 추적 테이블 불일치 발생.
- squash 후 `db reset`으로 검증 필수.

### Supabase CLI 실패 시 필수 규칙

세 지점의 일관성을 항상 보장해야 한다: **로컬 DB ↔ 코드(`schemas/`, `migrations/`) ↔ 원격 DB**

1. **`db push`, `db pull`, `db diff`, `db reset` 실패 시 반드시 전체 에러 메시지를 사용자에게 출력한다.**
   - 에러를 요약하거나 생략하지 않는다.
   - 실패 원인과 Supabase CLI가 제안하는 복구 명령어를 그대로 표시한다.
2. **실패 후 자동 재시도 금지.**
   - 원인 분석 → 사용자 확인 → 복구 순서를 따른다.
3. **히스토리 불일치 진단 절차:**
   - `supabase migration list`로 Local/Remote 매칭 상태를 확인한다.
   - 원격에만 있는 마이그레이션 → `migration repair --status reverted` 검토.
   - 로컬에만 있는 마이그레이션 → `db push`로 적용.
4. **복구 명령 실행 전 반드시 사용자 승인을 받는다.**
   - `migration repair`, `db reset --linked` 등 원격/로컬 상태를 변경하는 명령은 영향 범위를 설명한 후 실행한다.

### 일반 정책

- **진실 공급원은 Git**: 모든 DB/RPC/Edge Function 변경은 반드시 저장소에 반영.
- **대시보드 편집 금지**: 대시보드에서 변경 시, 즉시 `supabase db pull`로 백포트 후 커밋.
- **로컬 우선 개발**:
  - `supabase start`로 로컬 스택 실행.
  - `schemas/*.sql` 직접 수정 후, `supabase db diff -f <name>`으로 마이그레이션 자동 생성.
  - PR 전 `supabase db reset`으로 검증.
- **CLI로만 배포**:
  - DB: `supabase db push`
  - 함수: `supabase functions deploy`
- **Edge Functions 위치**: `supabase/functions/*` (공유 코드는 `_shared`).
  - 로컬 개발: `supabase functions serve`
  - 함수 설정: `supabase/config.toml` (예: `verify_jwt`).
- **Edge Functions 워크플로우**:
  - `supabase/functions/*`에서만 관리 (대시보드 편집 금지).
  - 배포 전 로컬 테스트 (`deno check` / `supabase functions serve`).
  - CLI로 배포: `supabase functions deploy <name>`.
- **시크릿 관리**: `supabase secrets set` 사용, 시크릿은 절대 커밋 금지.
- **환경 정책**:
  - 최소 `dev`와 `prod` 분리.
  - 프리뷰 브랜치 사용 시, PR의 읽기 전용 출력으로 취급.
- **마이그레이션 불변/squash/rebase 안전 규칙**:
  - **원격에 push된 마이그레이션 파일 수정 절대 금지.** 새 마이그레이션 생성만 허용.
  - **프로덕션에 이미 적용된 마이그레이션은 squash 금지.**
  - **Rebase**:
    - 기능 브랜치가 뒤처지면 `main`에 rebase.
    - 마이그레이션 충돌 시 재생성/재적용.
    - rebase 후 `supabase db reset`으로 검증.

## 핵심 원칙

- **UI 타입은 화면/도메인 모델이다.**
- **DTO는 API/RPC 입출력이다.**
- UI와 DTO 간 매핑은 단일 계층에서 명시적으로 수행한다.

## 아키텍처 결정 (고정)

- 현재 구조는 **프론트 API 레이어(`apps/*/features/*/api`)가 Supabase(RPC/View/Table)를 직접 호출**한다.
- 별도 BFF/서버 서비스 계층은 두지 않는다.
- 따라서 보안/정합성 핵심 규칙은 DB 계층(RPC, RLS, 제약, 트리거)에 둔다.
- 프론트 API 레이어는 UI-DTO 매핑, 요청 조립, 에러 변환, 화면 조합 책임을 가진다.

## 도메인 전략

- **상품**
  - RPC 출력: `ProductDTO`
  - UI 표시: `Product`
  - API 계층에서 한 번만 매핑
- **장바구니**
  - 저장: 정규화된 DTO (`product_id`, `option_id`, `quantity`, `coupon_id`, `reform_data`)
  - RPC 출력: `CartItemViewDTO` (UI용으로 조립)
  - UI 전용 상태 분리 (예: `CartItemUIState`의 `isSelected`)
- **주문**
  - 쓰기 DTO: 정규화된 ID 기반 입력
  - 읽기 DTO: `OrderViewDTO` (UI용으로 조립)

## RPC/백엔드 규칙

1. **RPC는 View DTO만 반환한다.**
   - 읽기 엔드포인트는 UI 타입이 아닌 DTO(`*ViewDTO`, `*RowDTO`, `*DTO`)를 반환한다.
2. **쓰기 RPC는 금액을 서버에서 계산한다.**
   - 클라이언트의 합계/가격을 절대 신뢰하지 않음. DB에서 산출.
3. **개인화된 RPC에는 반드시 인증을 적용한다.**
   - `auth.uid()` 체크 필수.
4. **보안/정합성 규칙은 DB 계층에 둔다.**
   - 권한, 소유권, 상태 전이 가드, 금액/수량 불변식은 RPC/RLS/제약으로 강제한다.
5. **프론트 API 레이어는 화면 조합 규칙을 담당한다.**
   - 검색 키워드 조합, 필터 UI 규칙, 에러 메시지 표현 등은 `*-api.ts`/`*-mapper.ts`에 둔다.
6. **RPC 보안 모드는 반드시 명시한다.**
   - SECURITY DEFINER 또는 SECURITY INVOKER를 항상 지정하고 RLS 영향을 검토.
7. **단순 조인/포맷팅에는 DB View를 우선 사용한다.**
   - View로 읽기 DTO를 직접 반환하여 중복 매핑을 줄인다.
8. **금액 일관성 우선, 공식 상세는 문서에.**
   - RPC 금액 계산은 내부적으로 일관성 유지 (단가/라인/합계 정합).
   - 도메인별 공식(예: 쿠폰 상한 계산)은 전용 문서에 기록.

## 파사드 규칙

- 파사드/서비스는 **여러 기능이 동일한 API 표면에 의존할 때만** 도입한다.
- API가 단일 기능 내에서만 사용되면 로컬로 유지 (파사드 불필요).

## 프론트엔드 규칙

1. **타입 계층화**
   - `types/view/*` — UI 렌더링용
   - `types/dto/*` — RPC 입출력용
   - `types/db/*` — 원시 DB 모델 (생성된 타입 포함)
2. **매핑 위치**
   - 매핑은 API 계층에서만 수행 (한 단계)
   - `api/*-api.ts`는 얇게 유지. 매퍼는 `api/*-mapper.ts`에 배치
   - UI 도메인 내부에 매퍼 금지
3. **공유 형태 금지**
   - UI 타입을 RPC 입력으로 사용 금지
   - RPC 출력을 매핑 없이 UI에서 직접 소비 금지
4. **공통 계산**
   - 공유 가격/할인 로직은 한 곳에 모아둔다
5. **구별된 유니언**
   - 매퍼에서 `as` 캐스트 대신 `type` 기반 좁히기를 선호
6. **non-null 단언 금지**
   - 명시적 런타임 검사로 보호되지 않는 한 `!` 사용 금지
7. **임포트 규칙**
   - `apps/` 내: `@/` 별칭으로 절대 경로 사용 (예: `import { ... } from '@/types/dto/order'`). 디렉토리 간 상대 경로 금지.
   - `packages/shared`: 현재 `@/` alias 미설정이므로 상대 경로 사용.
   - alias 정책이 바뀌면 이 규칙을 함께 갱신한다.

## 공유 매퍼 규칙

- 공유 매핑 헬퍼는 `packages/shared/src/mappers/shared-mapper.ts`에 배치
- 기능 간 매핑 로직 중복보다 재사용을 선호

## DTO 네이밍

- 쓰기 DTO: `*InputDTO`, `*CreateInputDTO`, `*UpdateInputDTO`
- 읽기 DTO: `*DTO`를 기본으로 하고, 용도에 따라 `*ViewDTO`, `*RowDTO`, `*ResultDTO`를 사용
- 매퍼: `to*InputDTO`, `to*View`, `from*DTO`

## 적용 규칙

- 새 RPC는 UI 타입을 직접 받거나 반환하면 안 된다.
- 혼합 형태 금지 (예: 하나의 타입에 `product` + `product_id` 동시 사용 금지).
- 기능별 `dto/`와 `view/` 폴더 분리를 선호.

## 참조 문서 (필수)

- ADR: `docs/adr/0001-read-view-write-rpc.md`
- 쓰기 경계: `docs/supabase-write-boundary.md`
- 쓰기 보안 감사 스냅샷: `docs/supabase-write-security-audit-2026-02-02.md`
- 가격/할인 도메인 규칙: `docs/pricing-discount-rules.md`

## AI 토론 중단 규칙

> 이 규칙은 **설계 토론·기술 상담**에만 적용된다.
> 코드 구현·버그 수정·리팩터링 등 **실행 작업에는 적용하지 않는다.**

### 핵심 규칙

설계 토론이 **결정** 단계에 도달하면 중단하고 실행으로 넘어간다.
더 많은 아이디어는 계속할 이유가 되지 않는다.

### 토론 흐름

| 단계 | 의미 | 제한 |
| ---- | ---- | ---- |
| 확장 | 아이디어 발산 | 최대 3개 또는 3턴 |
| 수렴 | 선택지 비교·결정 | 최대 2턴 |
| 결정 | 실행 계획 출력 | 1턴 |

### 중단 출력

토론 종료 시 다음을 간결하게 출력:

- `결론:` 한 줄 결정
- `다음 행동:` 번호 매긴 TODO 목록 (필요 시)
- `검증 방법:` 단일 실험 또는 구현 계획 (필요 시)
- `가정/리스크:` 최대 2줄 (필요 시)
