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

## 비자명한 명령어

```bash
pnpm db:new                                            # 마이그레이션 생성 (remote+local 최신 타임스탬프 자동)
supabase functions deploy <fn> --use-api               # 단일 Edge Function 서버측 번들 배포 (Docker 없이)
supabase migration list                                # 원격 적용 여부 확인
```

## 타입·매핑

- UI 타입(화면 모델)과 DTO(RPC 입출력) 분리. 매핑은 **API 계층에서만**
- `packages/shared/src/mappers/`는 API 계층에서만 호출 — 컴포넌트·훅 직접 호출 금지
- 한 타입에 `product`와 `product_id` 동시 사용 금지 (중복 참조 방지)
- 매퍼에서 `as` 남용 금지 — 구별된 유니언 좁히기 사용

## 프론트엔드

- API 파일(`*-api.ts`)은 얇게. 매핑은 `*-mapper.ts`로 분리

## DB 접근

- 새 쓰기 RPC는 `auth.uid()` 소유권 검증 포함, `SECURITY INVOKER` 기본
- `SECURITY DEFINER` 필요 시 함수에 `COMMENT ON FUNCTION`으로 사유 기록
- 직접 테이블 쓰기는 `cart_items` DELETE만 허용 (RLS `user_id = auth.uid()` 보장)
- 다른 예외는 RLS 근거 명시 필수

## Supabase 운영

- `supabase/schemas/*.sql`이 DB 구조 기준
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
