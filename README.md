# YeongSeon

넥타이 수선·판매·주문제작·AI 디자인을 한 곳에서 제공하는 이커머스 플랫폼입니다.
고객용 쇼핑몰과 관리자 대시보드로 구성되며, BFF 없이 Supabase를 직접 호출하는 아키텍처로 설계했습니다.

**[운영 사이트 →](https://essesion.shop/)**

## 구현 기능

**고객 (store)**

| 영역            | 기능                                                   |
| --------------- | ------------------------------------------------------ |
| 쇼핑            | 상품 탐색 · 장바구니 · 주문 · 토스페이먼츠 결제 · 쿠폰 |
| 수선 / 주문제작 | 견적 요청 · 커스텀 주문 · 샘플 주문                    |
| AI 디자인       | 넥타이 디자인 AI 생성 · 토큰 구매                      |
| 사후 처리       | 클레임 · 환불 · 마이페이지                             |

**관리자 (admin)**

| 영역 | 기능                      |
| ---- | ------------------------- |
| 운영 | 주문 · 클레임 · 고객 관리 |
| 상품 | 상품 · 가격 관리          |
| 견적 | 견적 요청 대응            |
| 분석 | 대시보드 · AI 생성 로그   |

## Tech Stack

| 영역     | 기술                                |
| -------- | ----------------------------------- |
| Frontend | React + TypeScript + Vite           |
| Backend  | Supabase (RPC, RLS, Edge Functions) |
| Monorepo | Turborepo + pnpm                    |
| Test     | Vitest · Playwright · pgTAP         |
| Payment  | 토스페이먼츠                        |

## 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│                                                     │
│   UI Component → Hook → API Layer → Mapper          │
│                           │                         │
│              UI 타입 ←── mapper ──→ DTO 타입         │
└───────────────────────────┬─────────────────────────┘
                            │ Supabase Client
┌───────────────────────────┴─────────────────────────┐
│                  Supabase (Backend)                  │
│                                                     │
│   ┌─────────┐  ┌─────────┐  ┌───────────────────┐  │
│   │  Views  │  │   RPC   │  │  RLS · Triggers   │  │
│   │ (Read)  │  │ (Write) │  │ (Security Layer)  │  │
│   └─────────┘  └─────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 설계 결정

**BFF 없는 직접 호출**
별도 서버 계층 없이 프론트 API 레이어가 Supabase를 직접 호출합니다.
서비스 규모에서 BFF가 주는 이점보다 운영 복잡도 증가가 크다고 판단했습니다.

**보안·정합성은 DB 계층에서 강제**
비즈니스 로직(금액 계산, 상태 전이, 소유권 검증)을 RPC와 RLS로 DB에 위임합니다.
클라이언트 코드를 신뢰하지 않고 DB가 최후 방어선 역할을 합니다.

**UI 타입 / DTO 완전 분리**
`*-api.ts`(Supabase 호출) + `*-mapper.ts`(DTO → UI 타입 변환)로 API 레이어를 분리합니다.
화면 모델과 DB 모델이 섞이지 않아 스키마 변경이 UI에 전파되지 않습니다.

## 품질 자동화 파이프라인

AI와 협업하는 개발 환경에서 코드 안정성과 보안을 보장하기 위해 다층 자동화 파이프라인을 구축했습니다.

**Pre-commit (로컬)**

| 검사                                   | 대상                           |
| -------------------------------------- | ------------------------------ |
| ESLint (`--max-warnings=0`) · Prettier | TS/TSX · JSON · MD · YML · CSS |
| TypeScript 타입 검사                   | 전체                           |

**E2E 테스트 (로컬)**

- Playwright로 store · admin 각각 독립 실행

**CI (GitHub Actions — PR · main push)**

| Job       | 검사 항목                                                                  |
| --------- | -------------------------------------------------------------------------- |
| `check`   | ESLint · 타입 검사 · Vitest · dependency-cruiser · Knip · jscpd · Prettier |
| `db`      | Supabase DB lint · pgTAP 기반 DB 유닛 테스트                               |
| `semgrep` | OWASP Top 10 보안 정적 분석                                                |

- **dependency-cruiser**: 레이어 간 의존성 규칙 위반 감지 (예: UI → API 직접 접근 차단)
- **Knip**: 미사용 코드·의존성 자동 탐지
- **jscpd**: 중복 코드 감지
- **Semgrep**: OWASP Top 10 기준 보안 취약점 스캔
- **pgTAP**: RPC·트리거 등 DB 로직을 SQL 레벨에서 직접 테스트

## 프로젝트 구조

```
apps/
  store/              # 고객용 쇼핑몰
  admin/              # 관리자 대시보드
packages/
  shared/             # 공통 컴포넌트 · 유틸
  supabase/           # Supabase 클라이언트 · 타입
  tsconfig/           # 공유 TypeScript 설정
supabase/
  schemas/            # DB 구조 Source of Truth (*.sql)
  migrations/         # 마이그레이션 이력
```

### Feature 단위 구조

```
apps/{app}/src/features/{domain}/
  api/
    {domain}-api.ts       # Supabase 호출 (얇게 유지)
    {domain}-mapper.ts    # DTO → UI 타입 변환
  components/             # 도메인 UI 컴포넌트
  types.ts                # UI 타입 정의
```
