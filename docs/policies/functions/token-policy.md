# 디자인 토큰 정책 (Token Policy)

## 1. 개요

- **구현 상태**: 구현됨
- **적용 범위**: AI 디자인 생성 비용 과금

디자인 토큰은 AI 디자인 생성 서비스의 이용 단위다.
토큰은 신규 가입 시 자동 지급되거나, 패키지 구매를 통해 충전된다.
모든 잔액 변경은 `design_tokens` 테이블에 원장 형식으로 기록된다.

---

## 2. 토큰 원장 타입

| 타입       | 설명                   | 방향  |
| ---------- | ---------------------- | ----- |
| `grant`    | 신규 가입 시 자동 지급 | +잔액 |
| `purchase` | 패키지 구매 후 충전    | +잔액 |
| `use`      | AI 디자인 생성 사용    | -잔액 |
| `refund`   | 이미지 생성 실패 환불  | +잔액 |
| `admin`    | 관리자 수동 조정       | ±잔액 |

---

## 3. 신규 가입 지급

- 가입 시 `grant` 타입으로 토큰 자동 지급
- 지급량은 `admin_settings`의 설정값에서 관리 (기본 30개)

---

## 4. 구매 패키지

| 패키지  | 설정 키                | 설명        |
| ------- | ---------------------- | ----------- |
| Starter | `token_plan_starter_*` | 소량 패키지 |
| Popular | `token_plan_popular_*` | 중간 패키지 |
| Pro     | `token_plan_pro_*`     | 대량 패키지 |

패키지별 가격과 토큰 수량은 `admin_settings` 테이블에서 관리된다.
`get_token_plans` RPC로 현재 플랜 목록 조회 가능.

---

## 5. 토큰 소비 단가

모델 × 요청 타입 × 품질 조합으로 `admin_settings`에서 관리.

| 설정 키                               | 모델   | 요청 타입      | 품질     |
| ------------------------------------- | ------ | -------------- | -------- |
| `design_token_cost_openai_text`       | OpenAI | text_only      | -        |
| `design_token_cost_openai_image`      | OpenAI | text_and_image | standard |
| `design_token_cost_openai_image_high` | OpenAI | text_and_image | high     |
| `design_token_cost_gemini_text`       | Gemini | text_only      | -        |
| `design_token_cost_gemini_image`      | Gemini | text_and_image | standard |
| `design_token_cost_gemini_image_high` | Gemini | text_and_image | high     |

---

## 6. 동시성 제어

`use_design_tokens` RPC는 `pg_advisory_xact_lock(hashtext(user_id))`를 사용해
동일 사용자의 동시 토큰 사용 요청이 겹치지 않도록 제어한다.

---

## 7. 토큰 환불 멱등성

`refund_design_tokens`는 `work_id`를 기반으로 중복 환불을 방지한다.
동일한 `work_id`로 두 번 환불 요청이 오면 두 번째 요청은 무시된다.

---

## 8. 주요 RPC 요약

| RPC                               | 권한                   | 설명                           |
| --------------------------------- | ---------------------- | ------------------------------ |
| `get_design_token_balance`        | INVOKER (본인)         | 본인 토큰 잔액 조회            |
| `use_design_tokens`               | DEFINER                | 토큰 차감 (advisory lock 포함) |
| `refund_design_tokens`            | DEFINER (service_role) | 실패 환불 (work_id 멱등)       |
| `manage_design_tokens_admin`      | DEFINER (관리자)       | 관리자 수동 조정               |
| `get_token_plans`                 | DEFINER                | 구매 플랜 목록 조회            |
| `get_design_token_balances_admin` | DEFINER (관리자)       | 다수 사용자 잔액 일괄 조회     |

---

## 9. 관련 프로세스

- [design-process.md](../processes/design-process.md) — AI 디자인 생성 시 토큰 사용

---

## 10. 관련 파일

| 파일                                              | 역할                                          |
| ------------------------------------------------- | --------------------------------------------- |
| `supabase/schemas/86_design_tokens.sql`           | design_tokens 테이블 + token_purchases 테이블 |
| `supabase/schemas/99_functions_design_tokens.sql` | 토큰 관련 RPC 전체                            |
