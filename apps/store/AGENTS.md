# AGENTS (apps/store)

## Hard Rules

- `supabase.storage` 직접 호출 금지 — 이미지는 `@/shared/lib/imagekit` + `@imagekit/react`만
- 폼 필드 마크업에 raw HTML(`<h3>`, `<p>`, `<div>`) 금지 — `@/shared/ui/field` 사용
- Zustand에 ReactNode 저장 금지
- `entities/`에 `.tsx` 추가 금지 (UI 없음)
- `pages/` 파일은 실제 UI 보유 필수 — 1줄 wrapper re-export 금지
- `index.css` 우회 금지 — 인라인 스타일·별도 CSS 파일로 새 변수/애니메이션/유틸리티 추가 금지
- `PageLayout` 안에서 최상위 `div`에 `px-*` 추가 금지 (이중 여백)
- Supabase 직접 호출은 `entities/*/api/`, `shared/lib/`, `app/providers/`에서만

## FSD 레이어

의존 방향: `app → pages → widgets → features → entities → shared`

| 레이어   | 위치            | 포함                                                | 금지                                       |
| -------- | --------------- | --------------------------------------------------- | ------------------------------------------ |
| app      | `src/app/`      | providers, router, 전역 엔트리                      | 하위 레이어 역참조                         |
| pages    | `src/pages/`    | 라우트 컴포넌트 (실제 UI)                           | `app` import, 직접 API 호출, 1줄 re-export |
| widgets  | `src/widgets/`  | cross-feature 조합 UI                               | `pages`, `app` import                      |
| features | `src/features/` | 단일 도메인 UI/훅/상호작용                          | cross-slice 조합, 상위 import              |
| entities | `src/entities/` | API, mapper, 도메인 타입                            | UI(`.tsx`), 상위 import                    |
| shared   | `src/shared/`   | ui, composite, layout, lib, hooks, constants, store | 상위 import                                |

**Public API**: `entities/`, `features/`, `widgets/` 슬라이스는 `index.ts`만 외부 노출 (얇은 re-export 허용). 상위 레이어는 내부 파일 직접 import 금지.

cross-feature 조합이 필요하면 `features`에 욱여넣지 말고 `widgets`로 올린다.

router(app)는 `pages`를 반드시 경유할 필요 없음 — `widgets`/`features` 직접 import 가능.

**새 파일 위치**:

| 종류     | 위치                                                 |
| -------- | ---------------------------------------------------- |
| API/타입 | `entities/{domain}/api/`, `entities/{domain}/model/` |
| UI/훅    | `features/{domain}/`                                 |
| 조합 UI  | `widgets/{widget-name}/`                             |
| 페이지   | `pages/{route}/`                                     |

## PageLayout 여백

좌우 여백은 `PageLayout`이 단일 소스 오브 트루스. 페이지가 직접 `px-*` 설정 금지.

기준값: `src/shared/layout/page-layout.tsx`

| 페이지 유형       | 사용 방식                                                 | 예시                                                                |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| 일반 콘텐츠       | `PageLayout` 사용, `px-*` 금지                            | `shop`, `cart`, `order-form`, `reform`                              |
| 좁은 중앙 정렬    | `PageLayout` 미사용, 내부 컨테이너 `px-4 sm:px-6 max-w-*` | `auth/login`, `payment/success·fail`, `token-purchase/success·fail` |
| 전체 화면 특수 UI | `PageLayout` 미사용, 페이지 특성에 맞게                   | `design`(채팅), `home`(랜딩)                                        |
| 팝업/정책         | 전용 레이아웃                                             | `shipping`(`PopupLayout`), 정책(`PolicyPageLayout`)                 |

**금지 패턴**: `lg:px-0` 같은 브레이크포인트로 패딩 0 되돌리기, `PageLayout` 없이 `mx-auto max-w-7xl px-4` 직접 작성.

## 스타일

`src/index.css`가 Tailwind 테마 변수, 커스텀 유틸리티, 전역 스타일의 단일 소스 오브 트루스.

- 새 CSS 변수 → `index.css`의 `:root` + `@theme inline`
- 색상·간격·폰트·반지름은 Tailwind 유틸리티(`bg-brand-ink`, `text-foreground-muted`) 우선. 매핑된 클래스 없으면 먼저 `@theme inline`에 추가
- 재사용되는 `@keyframes`/커스텀 유틸리티는 `index.css`에 추가
- 다크 모드 오버라이드는 `index.css`의 `.dark` 블록에서만

## 모달

| 타입                 | 처리            |
| -------------------- | --------------- |
| 텍스트 confirm/alert | `useModalStore` |
| 폼·복잡한 UI         | 로컬 `Dialog`   |

훅은 상태만 반환, 렌더링은 전용 컴포넌트(`*-modals.tsx`)가 담당.

## 폼

`@/shared/ui/field`의 `Field`, `FieldTitle`, `FieldDescription`, `FieldLabel`, `FieldContent`, `FieldError` 사용. raw HTML 금지.

## 이미지 업로드

- `@/shared/lib/imagekit` 인증 경로 + `@imagekit/react`
- 디자인 첨부 이미지는 `IMAGE_FOLDERS.DESIGN_SESSIONS`로 업로드
