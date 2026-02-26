# YeongSeon

AI 에이전트와 함께 개발하는 쇼핑몰 프로젝트입니다.

## Tech Stack

| 영역 | 기술 |
|------|------|
| Frontend | React + TypeScript + Vite |
| Backend | Supabase (RPC, RLS, Edge Functions) |
| Monorepo | Turborepo + pnpm |
| Test | Vitest |
| Payment | 토스페이먼츠 |

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

> BFF/서버 서비스 계층 없이, 프론트 API 레이어가 Supabase를 직접 호출합니다.
> 보안/정합성은 DB 계층(RPC, RLS, 제약, 트리거)에서 강제합니다.

## 개발 파이프라인

Claude Code + CodeRabbit 기반의 AI 에이전트 개발 워크플로우를 사용합니다.

```
  ┌──────────────────── Claude Code Plugins ────────────────────┐
  │                                                             │
  │  1. PLAN                                                    │
  │  ┌─────────────┐    ┌──────────────────┐                    │
  │  │ Brainstorm  │ ──→│  Writing Plans   │                    │
  │  │ (요구사항    │    │  (구현 계획 수립)  │                    │
  │  │  탐색/정리)  │    │                  │                    │
  │  └─────────────┘    └────────┬─────────┘                    │
  │                              │                              │
  │  2. IMPLEMENT                ▼                              │
  │  ┌─────────────┐    ┌──────────────────┐                    │
  │  │     TDD     │ ──→│  Frontend Design │  ← Context7       │
  │  │ (테스트 먼저 │    │  (컴포넌트 구현)   │    (최신 문서 참조) │
  │  │  작성)      │    │                  │                    │
  │  └─────────────┘    └────────┬─────────┘                    │
  │                              │         ← TypeScript LSP     │
  │  3. VERIFY                   ▼            (타입 검사)        │
  │  ┌─────────────┐    ┌──────────────────┐                    │
  │  │  Debugging  │ ──→│  Verification    │                    │
  │  │ (문제 발생시 │    │  (완료 전 검증)   │                    │
  │  │  체계적 분석)│    │                  │                    │
  │  └─────────────┘    └────────┬─────────┘                    │
  │                              │                              │
  │  4. DELIVER                  ▼                              │
  │  ┌─────────────┐    ┌──────────────────┐                    │
  │  │   Commit    │ ──→│  Push + PR       │                    │
  │  │ (/commit)   │    │ (/commit-push-pr)│                    │
  │  └─────────────┘    └────────┬─────────┘                    │
  │                              │                              │
  └──────────────────────────────┼──────────────────────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────┐
                  │       CodeRabbit         │
                  │  (PR 자동 코드 리뷰)      │
                  │                          │
                  │  - 코드 품질 검사          │
                  │  - 보안 취약점 탐지        │
                  │  - 개선 제안              │
                  └──────────────────────────┘
```

### 사용 도구 요약

| 단계 | 도구 | 역할 |
|------|------|------|
| **계획** | Superpowers (Brainstorm, Plans) | 요구사항 분석, 구현 계획 수립 |
| **구현** | Superpowers (TDD), Frontend Design | 테스트 우선 개발, UI 컴포넌트 구축 |
| **지원** | Context7, TypeScript LSP | 라이브러리 문서 참조, 실시간 타입 검사 |
| **검증** | Superpowers (Debug, Verify) | 체계적 디버깅, 완료 전 검증 |
| **배포** | Commit Commands | 커밋, 푸시, PR 생성 자동화 |
| **리뷰** | CodeRabbit, Code Review | PR 자동 리뷰, 코드 품질 관리 |
| **유지보수** | Code Simplifier, Claude MD Management | 코드 정리, 프로젝트 문서 관리 |
