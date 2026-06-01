# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-06-01
- Primary product surfaces: Store customer flows, Admin operating console, Admin settings-style forms.
- Evidence reviewed:
  - `apps/admin/seed-design.json`
  - `apps/admin/src/features/coupons/components/coupon-form.tsx`
  - `apps/admin/src/features/coupons/components/coupon-admin.css`
  - `apps/admin/src/features/pricing/components/pricing-form.tsx`
  - `apps/admin/src/features/pricing/components/pricing-form.css`
  - `apps/admin/src/features/settings/components/settings-form.tsx`
  - `apps/admin/src/features/settings/components/settings-form.css`
  - `docs/domains/design.md`

## Brand

- Personality: 신뢰할 수 있고 절제된 운영 도구. 장식보다 명확한 정보와 빠른 조작을 우선한다.
- Trust signals: 일관된 카드 경계, 명확한 저장/취소 상태, 입력 오류의 즉시 안내, 성공/실패 피드백.
- Avoid: 페이지별 임의 spacing, 같은 의미의 액션을 다른 위치에 두는 패턴, 중복 라이브 영역.

## Product goals

- Goals: 관리자가 가격, 쿠폰, 운영 기본값을 실수 없이 수정하고 변경 여부를 즉시 알 수 있게 한다.
- Non-goals: 별도 BFF/서버 서비스 계층 도입, 새 디자인 시스템 계층 도입, 기존 데이터/API 플로우 변경.
- Success signals: 저장 전 dirty 상태가 명확하고, 변경 취소가 동일하게 작동하며, 실패/성공 알림이 접근성 역할을 갖는다.

## Personas and jobs

- Primary personas: 운영 관리자, 주문/가격/쿠폰 담당자.
- User jobs: 운영 기준값 확인, 값 수정, 저장 전 변경사항 검토, 입력 오류 수정, 변경 취소.
- Key contexts of use: 데스크톱 중심의 관리자 콘솔, 좁은 화면에서는 모바일 대응 레이아웃.

## Information architecture

- Primary navigation: Refine/Ant Design 관리자 사이드바 리소스 목록.
- Core routes/screens: `/coupons`, `/coupons/create`, `/coupons/edit/:id`, `/pricing`, `/settings`.
- Content hierarchy: 페이지 제목/설명 → 상태 Callout → 설정 카드 또는 목록 패널 → 필터/검색 row → 데이터/필드 영역 → 하단 액션 row.

## Design principles

- Principle 1: 설정성 폼은 “수정 전/수정 중/저장 중/저장 후/오류” 상태가 같은 위치와 같은 어휘로 드러나야 한다.
- Principle 2: SEED Design 컴포넌트와 repo-local CSS 클래스를 우선 재사용하고, 새 추상화는 반복되는 레이아웃 토큰 수준에 제한한다.
- Tradeoffs: submit button은 일반 웹 폼 권장과 달리, 관리자 설정성 폼에서는 변경사항이 없을 때 disabled로 유지해 실수 저장을 줄인다.

## Visual language

- Color: SEED semantic tokens (`--seed-color-*`)만 사용한다.
- Typography: 페이지 제목 24/32/700, 카드 제목 18/26/700, 섹션 제목 16/24/700, 보조 텍스트 14/20.
- Spacing/layout rhythm: 페이지 gap 20px, 카드 padding 20px, 폼 grid gap 16px, action row gap 12px.
- Shape/radius/elevation: 설정성 카드 radius 16px, 내부 카드 radius 14px 기준.
- Motion: 현재 설정성 폼에는 별도 모션을 두지 않는다.
- Imagery/iconography: 설정성 폼은 텍스트/상태 컴포넌트 중심으로 유지한다.

## Components

- Existing components to reuse: `ActionButton`, `Callout`, `TextField`, `RadioSelectBoxRoot`, `RadioSelectBoxItem`, `Switch`, `Tabs`.
- New/changed components: 새 React 컴포넌트 대신 공통 CSS 패턴 `adminSettings*` 클래스로 카드/폼/action row를 맞춘다.
- Variants and states: primary save button, `neutralWeak` 변경 취소, disabled no-dirty save, loading save, inline invalid field.
- Selection hierarchy: `Tabs`는 화면 또는 주요 콘텐츠 섹션 전환에 사용하고, 전환 대상 카드/패널의 바깥에 둔다. `SegmentedControl`은 2~4개 이하의 즉시 보기 전환/정렬/간단 필터에만 사용한다. 목록 상태 필터처럼 선택지가 많거나 검색과 함께 조합되는 필터는 라벨이 보이는 필터 row의 `select`/입력 필드로 배치한다.
- Token/component ownership: SEED 컴포넌트가 control 상태와 접근성 기본값을 소유하고, repo CSS는 레이아웃만 소유한다.

## Accessibility

- Target standard: WCAG 2.2 AA에 맞춘 의미/키보드/상태 피드백 기준.
- Keyboard/focus behavior: 모든 조작은 `<button>`/폼 control 기반이어야 하며 SEED focus-visible을 유지한다.
- Contrast/readability: SEED semantic color를 사용한다.
- Screen-reader semantics: 성공 Callout은 `role="status"` + `aria-live="polite"`; 실패 Callout은 `role="alert"`; 같은 메시지를 중복 live region에 렌더링하지 않는다.
- Reduced motion and sensory considerations: 설정성 폼 상태 전환은 motion 없이 텍스트/disabled/loading으로 표현한다.

## Responsive behavior

- Supported breakpoints/devices: 720px 이하에서 설정성 action row는 세로 배치한다.
- Layout adaptations: 버튼은 모바일에서 full-width, 데스크톱에서는 하단 우측에 동일 gap/min-width로 배치한다.
- Touch/hover differences: SEED ActionButton의 기본 touch/focus/hover 처리를 따른다.

## Interaction states

- Loading: 데이터 로딩 문구는 `…`를 사용하고 필요한 곳만 polite live region으로 알린다.
- Empty: 데이터 테이블/목록은 기존 empty text를 유지한다.
- Error: 카드 상단 또는 관련 섹션에 `Callout role="alert"`를 렌더링한다.
- Success: 페이지 header 아래 또는 카드 상단에 `Callout role="status" aria-live="polite"`를 렌더링한다.
- Disabled: 변경사항이 없으면 저장 버튼은 표시하되 disabled; dirty 상태에서만 저장 활성화 및 변경 취소 표시.
- Offline/slow network, if applicable: 저장 중에는 save/cancel을 비활성화하고 loading 상태를 사용한다.

## Content voice

- Tone: 짧고 구체적인 관리자 도구 문체.
- Terminology: “저장”, “변경 취소”, “저장하지 않은 변경사항 N개”를 설정성 폼 공통 어휘로 사용한다.
- Microcopy rules: 오류는 가능한 수정 조건(예: “1 이상의 정수”)을 포함한다.

## Implementation constraints

- Framework/styling system: React 19, Vite, SEED Design snippets, CSS 파일 기반 전역 클래스.
- Design-token constraints: raw color/elevation 추가 없이 SEED CSS variable만 사용한다.
- Performance constraints: 입력별 controlled 상태는 기존 폼 범위에서 유지하고, 새 전역 상태를 만들지 않는다.
- Compatibility constraints: 프론트 API 레이어가 Supabase를 직접 호출하며, 데이터/API 로직은 UI dirty/reset에 필요한 범위 외 변경하지 않는다.
- Test/screenshot expectations: admin type-check, lint, build, react-doctor diff를 통과해야 한다.

## Open questions

- [ ] 설정성 폼 이탈 전 경고를 Refine `warnWhenUnsavedChanges`와 연동할지 결정 / owner: product+frontend / impact: dirty 변경 이탈 보호.
