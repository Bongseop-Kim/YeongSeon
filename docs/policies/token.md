---
policy: token
status: implemented
affects: [design]
last-verified: 2026-03-29
---

# 디자인 토큰 정책 (Token)

> AI 디자인 생성 서비스의 이용 단위. 신규 가입 시 자동 지급되거나 패키지 구매로 충전. 모든 잔액 변경은 `design_tokens` 테이블에 원장 형식으로 기록.

토큰 구매 결제는 `/token/purchase/payment`에서 진행하고, 성공/실패는 `/token/purchase/success`, `/token/purchase/fail`로 분기한다. 유상 토큰 환불 신청/승인 흐름은 [[token-refund]] 도메인에서 관리한다.

## 핵심 규칙

**PR-token-001**: 토큰 차감 순서 — `paid` 먼저 차감 후 `bonus` 차감

**PR-token-002**: 동시성 제어 — `use_design_tokens` RPC는 `pg_advisory_xact_lock(hashtext(user_id))`로 동일 사용자 동시 요청 직렬화

**PR-token-003**: 토큰 복원 멱등성 — `refund_design_tokens`는 `work_id` 기반 중복 복원 방지. 동일 `work_id` 두 번째 요청은 무시

**PR-token-004**: bonus 토큰은 환불 불가. paid 토큰만 수동 환불 신청 가능 (전자거래 규정)

**PR-token-005**: 신규 가입 시 `grant` 타입으로 bonus 토큰 자동 지급 (기본 30개, `admin_settings` 관리)

**PR-token-006**: 토큰 비용은 `admin_settings`에서 모델 × 요청 타입 × 품질 조합으로 관리

**PR-token-007**: 유상(paid) 토큰 이용기간 및 환불 가능기간은 결제 시점으로부터 1년 이내. 만료된 토큰은 사용 및 환불 불가

**PR-token-008**: 토큰은 사용자 간 양도 불가. 구매한 계정에서만 사용 가능

**PR-token-009**: 유상 토큰 환불은 원결제 수단과 동일한 방법으로만 진행 (카드 결제 → 카드 승인 취소, 계좌이체 → 계좌 입금)

**PR-token-010**: 1회 충전 금액 한도 100,000원 이하 (현재 플랜 최대 14,900원으로 준수 중)

## 잔액 유형

| 유형    | 설명                            | 환불 가능 | 원장 타입        |
| ------- | ------------------------------- | --------- | ---------------- |
| `paid`  | 패키지 구매로 획득              | 가능      | `purchase`       |
| `bonus` | 신규 가입 지급 또는 이벤트 지급 | 불가      | `grant`, `admin` |

## 원장 타입

| 타입       | 설명                                                            | 방향  |
| ---------- | --------------------------------------------------------------- | ----- |
| `grant`    | 신규 가입 시 자동 지급 (bonus)                                  | +잔액 |
| `purchase` | 패키지 구매 후 충전 (paid)                                      | +잔액 |
| `use`      | AI 디자인 생성 사용 (paid 먼저 차감 후 bonus)                   | -잔액 |
| `refund`   | 이미지 미생성 시 선차감 토큰 복원 또는 고객 paid 토큰 환불 신청 | +잔액 |
| `admin`    | 관리자 수동 조정                                                | ±잔액 |

## 구매 패키지

| 패키지  | 설정 키                | 설명        |
| ------- | ---------------------- | ----------- |
| Starter | `token_plan_starter_*` | 소량 패키지 |
| Popular | `token_plan_popular_*` | 중간 패키지 |
| Pro     | `token_plan_pro_*`     | 대량 패키지 |

패키지별 가격과 토큰 수량은 `admin_settings` 테이블에서 관리. `get_token_plans` RPC로 조회.

## 토큰 소비 단가

| 설정 키                                    | 모델   | 요청 타입       | 품질     |
| ------------------------------------------ | ------ | --------------- | -------- |
| `design_token_cost_openai_analysis`        | OpenAI | analysis        | standard |
| `design_token_cost_openai_prep`            | OpenAI | prep            | high     |
| `design_token_cost_openai_render_standard` | OpenAI | render_standard | standard |
| `design_token_cost_openai_render_high`     | OpenAI | render_high     | high     |
| `design_token_cost_fal_analysis`           | FAL    | analysis        | standard |
| `design_token_cost_fal_render_standard`    | FAL    | render_standard | standard |
| `design_token_cost_fal_render_high`        | FAL    | render_high     | high     |

## 주요 RPC

| RPC                               | 권한                   | 설명                                      |
| --------------------------------- | ---------------------- | ----------------------------------------- |
| `get_design_token_balance`        | INVOKER (본인)         | 본인 토큰 잔액 조회                       |
| `use_design_tokens`               | DEFINER                | 토큰 차감 (advisory lock 포함)            |
| `refund_design_tokens`            | DEFINER (service_role) | 이미지 미생성 시 토큰 복원 (work_id 멱등) |
| `manage_design_tokens_admin`      | DEFINER (관리자)       | 관리자 수동 조정                          |
| `get_token_plans`                 | DEFINER                | 구매 플랜 목록 조회                       |
| `get_design_token_balances_admin` | DEFINER (관리자)       | 다수 사용자 잔액 일괄 조회                |

## 관련 파일

| 파일                                              | 역할                                          |
| ------------------------------------------------- | --------------------------------------------- |
| `supabase/schemas/86_design_tokens.sql`           | design_tokens 테이블 + token_purchases 테이블 |
| `supabase/schemas/99_functions_design_tokens.sql` | 토큰 관련 RPC 전체                            |

## 횡단 참조

- [[design]] — AI 디자인 생성 시 토큰 사용
- [[payment]] — 토큰 구매 결제 흐름
- [[token-refund]] — 유상 토큰 환불 신청/승인 흐름
