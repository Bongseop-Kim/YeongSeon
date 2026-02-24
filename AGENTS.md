# AGENTS.md

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
- **마이그레이션 squash/rebase 안전 규칙**:
  - **프로덕션에 이미 적용된 마이그레이션은 squash 금지.**
  - **Rebase**:
    - 기능 브랜치가 뒤처지면 `main`에 rebase.
    - 마이그레이션 충돌 시 재생성/재적용.
    - rebase 후 `supabase db reset`으로 검증.

## 핵심 원칙

- **UI 타입은 화면/도메인 모델이다.**
- **DTO는 API/RPC 입출력이다.**
- UI와 DTO 간 매핑은 단일 계층에서 명시적으로 수행한다.

## 도메인 전략

- **상품**
  - RPC 출력: `ProductDTO`
  - UI 표시: `ProductView`
  - API 계층에서 한 번만 매핑
- **장바구니**
  - 저장: 정규화된 DTO (`product_id`, `option_id`, `quantity`, `coupon_id`, `reform_data`)
  - RPC 출력: `CartItemView` (UI용으로 조립)
  - UI 전용 상태 분리 (예: `CartItemUIState`의 `isSelected`)
- **주문**
  - 쓰기 DTO: 정규화된 ID 기반 입력
  - 읽기 DTO: `OrderView` (UI용으로 조립)

## RPC/백엔드 규칙

1. **RPC는 View DTO만 반환한다.**
   - 모든 읽기 엔드포인트는 `*View` 타입을 반환.
2. **쓰기 RPC는 금액을 서버에서 계산한다.**
   - 클라이언트의 합계/가격을 절대 신뢰하지 않음. DB에서 산출.
3. **개인화된 RPC에는 반드시 인증을 적용한다.**
   - `auth.uid()` 체크 필수.
4. **비즈니스 규칙은 서비스 계층에 둔다.**
   - RPC/SQL 내부에 정책 판단(if/else 비즈니스 로직) 금지.
5. **SQL은 데이터 접근/포맷팅만 담당한다.**
   - SQL은 조회, 필터링, 포맷팅만 처리.
   - 의미/판단 로직은 서비스 계층에 둔다.
6. **RPC 보안 모드는 반드시 명시한다.**
   - SECURITY DEFINER 또는 SECURITY INVOKER를 항상 지정하고 RLS 영향을 검토.
7. **단순 조인/포맷팅에는 DB View를 우선 사용한다.**
   - View로 `*ViewDTO`를 직접 반환하여 서비스 계층 매핑을 줄인다.
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
7. **임포트 규칙 (엄격)**
   - 항상 @/ 별칭으로 절대 경로 사용 (예: `import { ... } from '@/types/dto/order'`).
   - 디렉토리 간 상대 경로 (예: `../../types`) 금지.

## 공유 매퍼 규칙

- 공유 매핑 헬퍼는 `src/features/shared/api/shared-mapper.ts`에 배치
- 기능별 매퍼는 `src/features/[feature]/api/[feature]-mapper.ts` 패턴 준수
- 기능 간 매핑 로직 중복보다 재사용을 선호

## DTO 네이밍

- 쓰기 DTO: `*Input`, `*CreateInput`, `*UpdateInput`
- 읽기 DTO: `*View`, `*Output`, `*DTO`
- 매퍼: `to*Input`, `to*View`, `from*DTO`

## 적용 규칙

- 새 RPC는 UI 타입을 직접 받거나 반환하면 안 된다.
- 혼합 형태 금지 (예: 하나의 타입에 `product` + `product_id` 동시 사용 금지).
- 기능별 `dto/`와 `view/` 폴더 분리를 선호.

## 참조 문서 (필수)

- ADR: `docs/adr/0001-read-view-write-rpc.md`
- 쓰기 경계: `docs/supabase-write-boundary.md`
- 쓰기 보안 감사 스냅샷: `docs/supabase-write-security-audit-2026-02-02.md`
- 가격/할인 도메인 규칙: `docs/pricing-discount-rules.md`

## AI 상호작용 중단 규칙

### 핵심 규칙

AI 지원은 작업이 **결정, 실행, 또는 검증** 단계에 도달하면 중단해야 한다.
더 많은 아이디어는 계속할 이유가 되지 않는다.

---

### 상태 머신

모든 AI 지원 작업은 정확히 하나의 상태에 있어야 한다:

| 상태 | 의미           |
| ---- | -------------- |
| S0   | 문제 정의      |
| S1   | 아이디어 확장  |
| S2   | 수렴 / 선택   |
| S3   | 실행           |

---

### 강제 중단 조건

#### S0 → S1

- 문제가 한 문장으로 작성됨.
  → 자동으로 S1으로 이동.

---

#### S1 (확장) — 다음 중 하나라도 해당되면 중단

- 아이디어 3개 생성됨
- 새 아이디어가 기존 것의 사소한 변형
- 동일 패턴 반복

→ 즉시 S2로 이동.

하드 리밋: **최대 3턴**

---

#### S2 (수렴) — 다음 중 하나라도 해당되면 중단

- 선택지 ≤ 2개
- 결정 기준 ≤ 3개
- 권장 선택지가 명확함

→ 즉시 S3으로 이동.

하드 리밋: **최대 2턴**

---

#### S3 (실행) — 다음 중 하나라도 해당되면 완료

- TODO 목록 ≤ 5개 항목
- 첫 번째 작업이 30분 이내에 완료 가능
- 출력이 코드 / 명령어 / 파일 수준 작업

→ 대화 종료.

하드 리밋: **1턴**

---

### 필수 중단 출력

중단 시 AI는 다음 형식 중 하나만 출력해야 한다:

- `결론:` 한 줄 결정
- `다음 행동:` 번호 매긴 TODO 목록
- `검증 방법:` 단일 실험 또는 구현 계획

이 출력 이후 추가 제안 금지.

---

### 명시적 재개 규칙

AI는 사용자가 다음을 명시적으로 말해야만 계속할 수 있다:

- "다시 발산"
- "대안 더"
- "다시 비교"

그 외에는 중단 규칙이 유지된다.

---

### 한 줄 정의

> 종료는 **상태, 횟수, 턴 제한**으로 결정된다 — 직감이 아니다.
