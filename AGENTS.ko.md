# AGENTS.md (한국어 버전)

## 목표

코드베이스를 **Option B: UI/DTO 분리**로 표준화합니다.

## Supabase 워크플로우 전략

- **단일 진실 원천은 Git**: 모든 DB/RPC/Edge Function 변경은 반드시 저장소에 있어야 합니다.
- **대시보드 직접 수정 금지**: 대시보드에서 변경이 발생하면 즉시 `supabase db pull`로 백포트하고 마이그레이션을 커밋합니다.
- **로컬 우선 개발**:
  - 로컬 스택은 `supabase start`로 실행합니다.
  - 마이그레이션은 `supabase migration new`로 생성합니다(또는 수동 변경 후 `supabase db diff` 사용).
  - PR 전 `supabase db reset`으로 검증합니다.
- **배포는 CLI만 사용**:
  - DB: `supabase db push`
  - Functions: `supabase functions deploy`
- **Edge Functions 위치**: `supabase/functions/*` (`_shared`에 공통 코드).
  - 로컬 개발: `supabase functions serve`
  - 함수 설정: `supabase/config.toml` (예: `verify_jwt`)
- **Edge Functions 워크플로우**:
  - `supabase/functions/*`에서만 관리합니다(대시보드 수정 금지).
  - 배포 전 로컬 테스트(`deno check` / `supabase functions serve`)를 수행합니다.
  - 배포는 `supabase functions deploy <name>`를 사용합니다.
- **시크릿 관리**: `supabase secrets set` 사용, 시크릿 커밋 금지.
- **환경 정책**:
  - 최소 `dev`/`prod` 분리 유지.
  - Preview 브랜치를 쓴다면 PR의 읽기 전용 결과물로 취급.
- **마이그레이션 squash/rebase 안전 수칙**:
  - **운영에 적용된 마이그레이션은 절대 squash 금지.**
  - **첫 운영 배포 전** 또는 계획된 “스키마 리셋” 시점에만 squash.
  - **안전한 squash(프리프로덕션 전용)**:
    - 팀원 동기화 완료 및 로컬 미적용 마이그레이션 없음 확인.
    - 여러 마이그레이션을 단일 베이스라인 마이그레이션으로 교체.
    - 로컬에서 `supabase db reset` 후 스키마 일치 검증.
    - 원격 dev/preview DB는 충돌 히스토리 push 대신 **reset/recreate**.
  - **Rebase**:
    - 뒤처진 경우 feature 브랜치를 `main` 기준으로 rebase.
    - 마이그레이션 충돌 시 재생성/재적용.
    - rebase 후 `supabase db reset`으로 검증.

## 핵심 원칙

- **UI 타입은 표시/도메인 모델입니다.**
- **DTO는 API/RPC 입출력입니다.**
- UI와 DTO 간 매핑은 하나의 명시적인 계층에서만 수행합니다.

## 도메인 전략

- **Product**
  - RPC 출력: `ProductDTO`
  - UI 표시: `ProductView`
  - API 계층에서 1회 매핑
- **Cart**
  - 저장 형태: 정규화 DTO(`product_id`, `option_id`, `quantity`, `coupon_id`, `reform_data`)
  - RPC 출력: `CartItemView`(UI용 조합 결과)
  - UI 전용 상태 분리(예: `isSelected`용 `CartItemUIState`)
- **Order**
  - 쓰기 DTO: ID 기반 정규화 입력
  - 읽기 DTO: `OrderView`(UI용 조합 결과)

## RPC/백엔드 규칙

1. **RPC는 View DTO만 반환합니다.**
   - 모든 read 엔드포인트는 `*View` 타입 반환.
2. **Write RPC는 금액을 서버에서 계산합니다.**
   - 클라이언트 합계/가격을 신뢰하지 않고 DB 기준으로 산출.
3. **개인화 RPC는 인증 강제입니다.**
   - 반드시 `auth.uid()` 체크 사용.
4. **비즈니스 규칙은 서비스 계층에 둡니다.**
   - RPC/SQL 내부에 정책성 if/else 로직을 과도하게 두지 않음.
5. **SQL은 데이터 접근/포맷팅에 한정합니다.**
   - SQL은 조회, 필터링, 포맷팅만 담당.
   - 의미/의사결정 로직은 서비스 계층 담당.
6. **RPC 보안 모드를 명시합니다.**
   - `SECURITY DEFINER` 또는 `SECURITY INVOKER`를 항상 선언하고 RLS 영향 검토.
7. **단순 조인/포맷팅은 DB View 우선입니다.**
   - View로 `*ViewDTO`를 직접 반환해 서비스 매핑 부담을 줄입니다.
8. **금액 정합성 우선, 수식 상세는 문서화합니다.**
   - RPC 금액 계산은 내부 정합성(unit/line/total)을 유지.
   - 도메인별 수식(예: 쿠폰 cap)은 AGENTS가 아닌 전용 문서에 기록.

## 파사드 규칙

- 여러 기능이 같은 API 표면에 의존할 때만 facade/service를 도입합니다.
- 단일 기능에서만 쓰는 API는 로컬에 둡니다(facade 불필요).

## 프론트엔드 규칙

1. **타입 계층화**
   - UI 렌더링: `types/view/*`
   - RPC 입출력: `types/dto/*`
   - 원시 DB 모델(생성 타입 포함): `types/db/*`
2. **매핑 위치**
   - 매핑은 API 계층에서만(한 번만) 수행.
   - `api/*-api.ts`는 얇게 유지, 매퍼는 `api/*-mapper.ts`에 배치.
   - UI 도메인 내부에 매퍼 두지 않음.
3. **공유 shape 금지**
   - UI 타입을 RPC 입력으로 사용 금지.
   - RPC 출력을 매핑 없이 UI가 직접 소비 금지.
4. **공통 계산**
   - 가격/할인 공통 로직은 한 곳에서 관리.
5. **판별 유니온**
   - 매퍼에서 `as` 캐스팅보다 `type` 기반 좁히기 우선.
6. **non-null assertion 회피**
   - 런타임 가드 없이 `!` 사용 금지.
7. **Import 규칙(엄격)**
   - 교차 디렉터리 import는 항상 `@/` 절대 경로 사용.
   - 상대 경로(`../../types`) 사용 금지.

## 공용 매퍼 규칙

- 공용 매핑 헬퍼는 `src/features/shared/api/shared-mapper.ts`에 둡니다.
- 기능별 매퍼는 `src/features/[feature]/api/[feature]-mapper.ts` 패턴을 따릅니다.
- 중복 구현보다 재사용을 우선합니다.

## DTO 네이밍

- 쓰기 DTO: `*Input`, `*CreateInput`, `*UpdateInput`
- 읽기 DTO: `*View`, `*Output`, `*DTO`
- 매퍼: `to*Input`, `to*View`, `from*DTO`

## 적용 강제

- 신규 RPC는 UI 타입을 직접 입력/출력으로 받지 않습니다.
- 혼합 shape 금지(예: 한 타입에 `product`와 `product_id` 동시 포함 금지).
- 기능 단위 `dto/`, `view/` 폴더 분리를 우선합니다.

## 참조 문서(필수)

- ADR: `docs/adr/0001-read-view-write-rpc.md`
- Write 경계: `docs/supabase-write-boundary.md`
- Write 보안 점검 스냅샷: `docs/supabase-write-security-audit-2026-02-02.md`
- 가격/할인 도메인 규칙: `docs/pricing-discount-rules.md`

## AI 상호작용 중단 규칙

### 핵심 규칙

AI 지원은 작업이 **결정(Decision), 실행(Execution), 검증(Verification)** 단계에 도달하면 중단해야 합니다.  
아이디어를 더 내는 것은 지속 사유가 아닙니다.

---

### 상태 머신

모든 AI 보조 작업은 아래 상태 중 정확히 하나여야 합니다.

| 상태 | 의미 |
| --- | --- |
| S0 | 문제 정의 |
| S1 | 아이디어 발산 |
| S2 | 수렴/선택 |
| S3 | 실행 |

---

### 강제 중단 조건

#### S0 → S1

- 문제가 한 문장으로 작성되면 자동으로 S1로 이동.

---

#### S1(발산) — 아래 중 하나라도 해당하면 중단

- 아이디어 3개 생성 완료
- 기존 아이디어의 미세 변형만 반복
- 동일 패턴 반복

→ 즉시 S2로 이동.

하드 리밋: **최대 3턴**

---

#### S2(수렴) — 아래 중 하나라도 해당하면 중단

- 옵션 수 ≤ 2
- 의사결정 기준 ≤ 3
- 추천안이 명확함

→ 즉시 S3로 이동.

하드 리밋: **최대 2턴**

---

#### S3(실행) — 아래 중 하나라도 해당하면 완료

- TODO ≤ 5개
- 첫 작업이 30분 이내 수행 가능
- 산출물이 코드/명령/파일 단위 작업

→ 대화를 종료해야 함.

하드 리밋: **1턴**

---

### 필수 중단 출력 형식

중단 시 아래 형식 중 하나만 사용:

- `결론:` 한 줄 의사결정
- `다음 행동:` 번호형 TODO 목록
- `검증 방법:` 단일 실험/구현 계획

이 출력 뒤에는 추가 제안 금지.

---

### 명시적 재개 규칙

사용자가 아래 중 하나를 명시적으로 말할 때만 계속:

- “다시 발산”
- “대안 더”
- “다시 비교”

그 외에는 중단 규칙 유지.

---

### 한 줄 정의

> 종료 여부는 직관이 아니라 **상태, 개수, 턴 제한**으로 결정한다.
