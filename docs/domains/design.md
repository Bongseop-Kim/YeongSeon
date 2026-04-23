---
domain: design
status: implemented
last-verified: 2026-04-23
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
    A[고객 텍스트/이미지 입력] --> B{CI 이미지 + all-over/one-point 인가}
    B -->|yes| C[prepare-pattern-composite]
    B -->|no| D[라우트 결정]
    C --> E[magick-wasm 전처리 및 타일/모티프 합성]
    E --> F{보정 필요 여부}
    F -->|yes| G[OpenAI images/edits 보정]
    F -->|no| D
    G --> D
    D -->|fal_edit / fal_inpaint / fal_controlnet / 조건 충족 fal_tiling| H[generate-fal-api]
    D -->|그 외| I[generate-open-api]
    H --> J{토큰 잔액 확인 및 차감}
    I --> J
    J -->|부족| K[InsufficientTokensError 반환]
    J -->|충분| L[분석 + 최종 렌더]
    L -->|성공| M[이미지 URL + contextChip 반환]
    L -->|실패| N[refund_design_tokens RPC - 토큰 복원]
    N --> O[에러 반환]
```

### 패턴 준비와 최종 렌더 분리

- `prepare-pattern-composite`는 반복 패턴의 최종 렌더러가 아니라 **사전 준비 단계**다.
- `all-over` 또는 `one-point`에서 CI 이미지가 있으면 먼저 이 Edge Function이 호출된다.
- 준비 단계에서는 `magick-wasm` 기반으로 소스 이미지를 잘라내고, 반복 타일(`composeAllOverTile`) 또는 원포인트 모티프(`composeOnePointMotif`)를 합성한다.
- 반복에 부적합한 소스만 OpenAI `images/edits`로 보정한다.
- 그 다음 최종 렌더를 `fal` 또는 `OpenAI` 중 하나로 보낸다.
- 따라서 `fal_tiling`은 “반복 패턴을 준비하는 단계”가 아니라 **준비된 반복 타일을 사용한 최종 렌더 라우트**를 뜻한다.
- `fal_tiling`으로 판정돼도 준비된 타일이 없으면 최종 호출은 `openai`로 폴백한다.

## 토큰 유형

| 유형  | 취득 방법                  | 환불 가능 여부             |
| ----- | -------------------------- | -------------------------- |
| paid  | 토큰 구매로 획득           | 가능 (고객 수동 환불 신청) |
| bonus | 신규 가입 지급 또는 이벤트 | 불가                       |

## AI 모델별 Edge Function

| 구분          | Edge Function               | 역할           | 비고                                                                     |
| ------------- | --------------------------- | -------------- | ------------------------------------------------------------------------ |
| preprocessing | `prepare-pattern-composite` | 패턴 준비      | `magick-wasm` 기반 소스 정리, 반복 타일/모티프 합성, 필요 시 OpenAI 보정 |
| openai render | `generate-open-api`         | 최종 분석/생성 | 입력 이미지가 있으면 `images/edits`, 없으면 `images/generations` 사용    |
| fal render    | `generate-fal-api`          | 최종 분석/생성 | `fal_edit`, `fal_inpaint`, `fal_controlnet`, 조건 충족 `fal_tiling` 담당 |

## 비즈니스 규칙

- **BR-design-001**: 토큰 차감 순서 — paid 먼저 차감, 이후 bonus 차감.
- **BR-design-002**: `token_refund`가 접수 상태인 동안에는 토큰 사용 불가.
- **BR-design-003**: `text_only`는 high 품질 미지원.
- **BR-design-004**: 이미지 미생성 시(데이터 부족 또는 텍스트 전용 응답) 선차감된 토큰을 `refund_design_tokens` RPC로 복원. `work_id` 기반 멱등 처리로 중복 복원 방지.
- **BR-design-005**: paid 토큰 미사용분은 전자거래 규정에 따라 고객이 수동 환불 신청 가능. bonus 불가.
- **BR-design-006**: 동일 주문에 `접수` 또는 `완료` 상태의 `token_refund`가 있으면 중복 신청 불가.
- **BR-design-007**: 신규 가입 시 bonus 토큰 30개 자동 지급.
- **BR-design-008**: 토큰 비용은 `admin_settings`에서 모델×요청 타입 조합으로 관리한다. 기본 요청 타입은 `analysis`, `prep`, `render_standard`, `render_high`이며, `prep`은 부적합 이미지의 OpenAI 패턴 보정이 실제 실행된 경우에만 별도 차감된다.
- **BR-design-009**: 멀티턴 대화 지원 — 프론트에서 `conversation_history` 유지해 이전 맥락 Edge Function에 전달.
- **BR-design-010**: `ciPlacement === "one-point"` 요청 시 첫 번째 색상으로 `solid` backgroundPattern을 자동 생성해 payload에 주입한다. 프롬프트에 배경 패턴 명세로 반영되어 AI가 다른 배경을 임의로 생성하지 않도록 제한한다.
- **BR-design-011**: AI 응답의 `detectedDesign`에 `positionIntent`("move-left" | "move-right" | "move-up" | "move-down") 필드 포함. 모티프 위치 이동 요청을 감지해 후속 생성에 반영한다.

## 화면 및 진입점

| 앱    | 경로                     | 설명        |
| ----- | ------------------------ | ----------- |
| store | `/design`                | 디자인 생성 |
| store | `/my-page/token-history` | 토큰 내역   |

## API 호출 흐름

```
프론트 → ai-design-api.ts
  └─ source/ci/reference 이미지를 Base64로 변환
  └─ CI 이미지 + all-over/one-point면 prepare-pattern-composite 호출
       ├─ magick-wasm으로 source 정리
       ├─ all-over면 반복 타일 합성
       ├─ one-point면 모티프 합성
       └─ 필요 시 OpenAI images/edits로 보정
  └─ resolveGenerationRouteAsync로 최종 렌더 라우트 결정
  └─ shouldUseFalPipeline 판정
  └─ one-point CI 배치 시 solid backgroundPattern 자동 생성
  └─ provider chain 실행
       ├─ fal 조건 충족 → generate-fal-api
          fal_edit / fal_inpaint / fal_controlnet / 조건 충족 fal_tiling
       └─ 그 외 → generate-open-api
  └─ Edge Function 호출 (메시지 / 디자인 컨텍스트 / 대화 히스토리 / 첨부 파일 / backgroundPattern / prepared tile or motif)
  └─ 응답 파싱 (AI 메시지 / 이미지 URL / 태그 / contextChip / positionIntent)
  └─ RPC: get_design_token_balance (업데이트된 잔액 조회)
```

## 관련 파일

| 파일                                                             | 설명                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| `apps/store/src/entities/design/api/ai-design-api.ts`            | 프론트 AI 디자인 API 레이어 및 provider chain 진입점     |
| `apps/store/src/entities/design/api/ai-design-mapper.ts`         | Edge Function 호출 payload 빌더 (backgroundPattern 포함) |
| `apps/store/src/entities/design/api/resolve-generation-route.ts` | 최종 렌더 라우트 판정                                    |
| `apps/store/src/entities/design/api/should-use-fal-pipeline.ts`  | `fal_tiling` 사용 가능 여부 probe                        |
| `supabase/functions/prepare-pattern-composite/index.ts`          | CI 패턴 준비 Edge Function                               |
| `supabase/functions/_shared/pattern-composite.ts`                | `magick-wasm` 기반 source 정리 / 타일 / 모티프 합성      |
| `supabase/functions/generate-fal-api/index.ts`                   | Fal 기반 최종 렌더 Edge Function                         |
| `supabase/functions/generate-open-api/index.ts`                  | OpenAI 기반 최종 렌더 Edge Function                      |
| `supabase/functions/_shared/design-request.ts`                   | `BackgroundPattern` 타입 및 요청 스키마                  |
| `supabase/functions/_shared/prompt-builders.ts`                  | 이미지/텍스트 프롬프트 빌더 (positionIntent 포함)        |
| `supabase/functions/_shared/preprocessing/upscale.ts`            | 참조 이미지 업스케일 전처리 (512px 미만 자동 확대)       |
| `supabase/schemas/86_design_tokens.sql`                          | 디자인 토큰 테이블 스키마                                |
| `supabase/schemas/99_functions_design_tokens.sql`                | 토큰 RPC (use / refund / balance 등)                     |

## 횡단 참조

- [[token]] — 토큰 구매, 유형별 정책 (paid 환불 / 이미지 미생성 시 복원)
- [[token-refund]] — 유상 토큰 환불 신청/승인 흐름

## 미결 사항

없음.
