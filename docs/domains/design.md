---
domain: design
status: implemented
last-verified: 2026-03-29
---

# Design (AI 디자인 생성)

고객이 텍스트 또는 이미지를 입력하면 AI 모델이 넥타이 디자인을 생성하는 단발성 프로세스. 별도 상태 전이 없이 요청→생성→완료(또는 실패)로 즉시 종료. 생성 비용은 요청 시 토큰으로 선차감되며, 이미지 미생성 시 차감된 토큰을 복원한다.

## 경계

| 구분      | 내용                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Always do | 토큰 차감 전 잔액 확인. `token_refund`가 접수 상태인 동안 생성 요청 차단. paid 토큰 먼저 차감 후 bonus 차감. work_id 기반 멱등 처리로 중복 토큰 복원 방지. |
| Ask first | 토큰 비용 변경. bonus 토큰 환불 허용.                                                                                                                      |
| Never do  | bonus 토큰 수동 환불 허용. 동일 주문 환불 중복 신청 허용. text_only에 high 품질 적용. 프론트에서 토큰 잔액 계산.                                           |

## 상태 전이

없음. 단발성 프로세스로 상태 머신이 존재하지 않는다.

### 생성 프로세스 흐름

```mermaid
flowchart TD
    A[고객 텍스트/이미지 입력] --> B{AI 모델 선택}
    B -->|openai| C[generate-open-api Edge Function]
    B -->|gemini| D[generate-google-api Edge Function]
    C --> E{토큰 잔액 확인}
    D --> E
    E -->|부족| F[InsufficientTokensError 반환]
    E -->|충분| G[use_design_tokens RPC - 토큰 차감]
    G --> H[AI API 호출]
    H -->|성공| I[이미지 URL + 태그 + contextChip 반환]
    H -->|실패| J[refund_design_tokens RPC - 토큰 복원]
    J --> K[에러 반환]
```

## 토큰 유형

| 유형  | 취득 방법                  | 환불 가능 여부             |
| ----- | -------------------------- | -------------------------- |
| paid  | 토큰 구매로 획득           | 가능 (고객 수동 환불 신청) |
| bonus | 신규 가입 지급 또는 이벤트 | 불가                       |

## AI 모델별 Edge Function

| 모델   | Edge Function         | 지원 입력       |
| ------ | --------------------- | --------------- |
| openai | `generate-open-api`   | 텍스트 / 이미지 |
| gemini | `generate-google-api` | 텍스트 / 이미지 |

## 비즈니스 규칙

- **BR-design-001**: 토큰 차감 순서 — paid 먼저 차감, 이후 bonus 차감.
- **BR-design-002**: `token_refund`가 접수 상태인 동안에는 토큰 사용 불가.
- **BR-design-003**: `text_only`는 high 품질 미지원.
- **BR-design-004**: 이미지 미생성 시(데이터 부족 또는 텍스트 전용 응답) 선차감된 토큰을 `refund_design_tokens` RPC로 복원. `work_id` 기반 멱등 처리로 중복 복원 방지.
- **BR-design-005**: paid 토큰 미사용분은 전자거래 규정에 따라 고객이 수동 환불 신청 가능. bonus 불가.
- **BR-design-006**: 동일 주문에 `접수` 또는 `완료` 상태의 `token_refund`가 있으면 중복 신청 불가.
- **BR-design-007**: 신규 가입 시 bonus 토큰 30개 자동 지급.
- **BR-design-008**: 토큰 비용은 `admin_settings`에서 모델×요청 타입×품질 조합으로 관리 (`design_token_cost_openai_text` 등 6개 키).
- **BR-design-009**: 멀티턴 대화 지원 — 프론트에서 `conversation_history` 유지해 이전 맥락 Edge Function에 전달.

## 화면 및 진입점

| 앱    | 경로                     | 설명        |
| ----- | ------------------------ | ----------- |
| store | `/design`                | 디자인 생성 |
| store | `/my-page/token-history` | 토큰 내역   |

## API 호출 흐름

```
프론트 → ai-design-api.ts
  └─ 참조 이미지를 Base64로 변환
  └─ AI 모델에 따라 Edge Function 선택
       ├─ openai → generate-open-api
       └─ gemini → generate-google-api
  └─ Edge Function 호출 (메시지 / 디자인 컨텍스트 / 대화 히스토리 / 첨부 파일)
  └─ 응답 파싱 (AI 메시지 / 이미지 URL / 태그 / contextChip)
  └─ RPC: get_design_token_balance (업데이트된 잔액 조회)
```

## 관련 파일

| 파일                                                  | 설명                                 |
| ----------------------------------------------------- | ------------------------------------ |
| `apps/store/src/features/design/api/ai-design-api.ts` | 프론트 AI 디자인 API 레이어          |
| `supabase/schemas/86_design_tokens.sql`               | 디자인 토큰 테이블 스키마            |
| `supabase/schemas/99_functions_design_tokens.sql`     | 토큰 RPC (use / refund / balance 등) |

## 횡단 참조

- [[token]] — 토큰 구매, 유형별 정책 (paid 환불 / 이미지 미생성 시 복원)
- [[token-refund]] — 유상 토큰 환불 신청/승인 흐름

## 미결 사항

없음.
