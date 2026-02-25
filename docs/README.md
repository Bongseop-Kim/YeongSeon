# Docs Index

## 목적

이 디렉터리는 **현재 유효한 정책/계약 문서**만 유지한다.  
과거 회귀 로그, 시점 스냅샷 같은 이력성 문서는 루트 `docs/`에 두지 않는다.

## Source Of Truth

1. DB 구조/RLS/함수 정의: `supabase/schemas/*.sql`
2. AI 작업 규칙 요약: `CLAUDE.md`
3. 아키텍처 결정: `docs/adr/0001-read-view-write-rpc.md`
4. 도메인별 계약/보안/테스트 최소 기준: 아래 개별 문서

문서 간 충돌 시:
- DB 동작 관련 사실은 `supabase/schemas/*.sql`이 우선
- 그 외 정책은 더 **구체적인 범위**를 가진 문서가 우선

## 문서 목록

- `adr/0001-read-view-write-rpc.md`
  - 읽기(View) / 쓰기(RPC 중심) 아키텍처 결정
- `rpc-contracts.md`
  - 현재 read/write 계약 표 (진입점/보안모드/소유권 검증)
- `security-model.md`
  - 역할/경로별 보안 모델 및 금지 패턴
- `supabase-write-boundary.md`
  - 주문/장바구니/클레임 쓰기 경계 상세
- `claims-backend-design.md`
  - 클레임 도메인 설계/검증 절차
- `pricing-discount-rules.md`
  - 가격/할인 불변식
- `testing-minimum.md`
  - 머지/배포 전 최소 검증 기준

## 업데이트 정책

- 코드 변경으로 동작이 바뀌면 관련 문서를 **같은 PR**에서 함께 갱신한다.
- 경로/함수명/뷰명은 실제 코드 기준으로 유지한다. (`apps/store/...`, `supabase/schemas/...`)
- 새 쓰기 경로를 추가하면 최소 다음 3개를 같이 갱신한다:
  - `rpc-contracts.md`
  - `security-model.md`
  - `supabase-write-boundary.md`

## 빠른 점검

- 현재 문서가 실제 호출 경로와 일치하는가?
- 인증/소유권/금액 계산 책임이 문서에 명확히 적혀 있는가?
- 예외 경로(예: 직접 테이블 쓰기)가 문서에 명시되어 있는가?
