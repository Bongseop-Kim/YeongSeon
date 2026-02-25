## Supabase 워크플로우 (브랜치/CI/CD)

- **브랜치 정책 (Git)**
  - `main`은 운영(production) 브랜치이며 보호(protected) 상태로 유지합니다.
  - 기능 브랜치에는 마이그레이션과 함수 변경을 반드시 함께 포함합니다.
  - `main` 직접 푸시는 금지하고, PR 머지만 허용합니다.
- **Supabase 브랜치 정책 (선택)**
  - Preview 브랜치는 PR 검증 용도로만 사용합니다.
  - Preview에서 직접 핫픽스하지 않고, 반드시 Git 소스를 수정합니다.
- **CI/CD 정책**
  - PR 단계에서 lint/test와 `supabase db diff`를 실행해 스키마 드리프트를 확인합니다.
  - `main` 머지 후에는 `supabase db push` → `supabase functions deploy` 순서로 배포합니다.
  - 필요 시 운영 배포에 수동 승인 단계를 둡니다.
- **배포 규칙**
  - DB 마이그레이션을 함수 배포보다 먼저 적용합니다.
  - 롤백은 파괴적 복구 대신 `커밋 되돌리기 + 신규 정방향 마이그레이션`으로 처리합니다.

## 아키텍처 의사결정 문서

- Read/Write 경계 ADR: `docs/adr/0001-read-view-write-rpc.md`
- Write 경계 명세: `docs/supabase-write-boundary.md`
