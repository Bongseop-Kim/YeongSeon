## 목표

코드베이스를 UI/DTO 분리 패턴으로 일관되게 유지한다.

## 아키텍처 결정 (고정)

- 프론트 API 레이어(`apps/*/features/*/api`)가 Supabase(RPC/View/Table)를 직접 호출한다.
- 별도 BFF/서버 서비스 계층은 두지 않는다.
- 보안/정합성 핵심 규칙은 DB 계층(RPC, RLS, 제약, 트리거)에서 강제한다.

## 하드 가드레일

- UI 타입은 화면 모델, DTO는 RPC 입출력 모델로 분리한다.
- UI와 DTO 매핑은 API 계층에서만 수행한다.
- 새 RPC는 UI 타입을 직접 입력/출력으로 사용하지 않는다.
- 혼합 형태를 금지한다. (예: 하나의 타입에 `product`와 `product_id` 동시 사용 금지)
- 쓰기 보안/권한/금액 규칙은 `docs/supabase-write-boundary.md`, `docs/pricing-discount-rules.md`를 기준으로 따른다.
- RPC 금액 계산은 내부 정합성을 유지해야 한다 (unit_price/line/total 간 reconciliation).

## 프론트엔드 규칙

- API 파일(`*-api.ts`)은 얇게 유지하고, 매핑은 `*-mapper.ts`로 분리한다.
- UI 레이어가 RPC DTO를 매핑 없이 직접 소비하지 않는다.
- 매퍼에서 `as` 남용보다 구별된 유니언(`type`) 기반 좁히기를 우선한다.
- 런타임 검증 없이 non-null 단언(`!`)을 사용하지 않는다.

## Supabase 작업 안전 규칙

- `supabase/schemas/*.sql`을 DB 구조의 기준으로 사용한다. 스키마 파일은 다음 SQL 구조를 반드시 포함해야 한다: `CREATE TABLE/TYPE/SEQUENCE`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, `CREATE INDEX`, `CREATE TRIGGER`, `CREATE VIEW`, `CREATE FUNCTION`. 누락 시 PR/배포 전 수동 확인 필요.
- 원격에 push된 마이그레이션 파일은 수정하지 않는다. 변경은 새 마이그레이션으로만 반영한다.
- 마이그레이션 파일 수정/삭제/squash 전 `supabase migration list`로 Remote 존재 여부를 먼저 확인한다.
- `db push`, `db pull`, `db diff`, `db reset` 실패 시 에러 전문을 그대로 공유한다. 요약/생략 금지.
- Supabase CLI 실패 후 자동 재시도하지 않는다.
- `migration repair`, `db reset --linked` 등 상태 변경 복구 명령은 영향 범위를 설명한 뒤 사용자 승인 후 실행한다.

## 참고 문서

- `docs/README.md`
- `docs/adr/0001-read-view-write-rpc.md`
- `docs/rpc-contracts.md`
- `docs/security-model.md`
- `docs/supabase-write-boundary.md`
- `docs/claims-backend-design.md`
- `docs/pricing-discount-rules.md`
- `docs/testing-minimum.md`
