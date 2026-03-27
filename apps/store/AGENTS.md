## 폼 컴포넌트 규칙

- 폼 필드의 레이블·설명·에러 마크업은 `@/components/ui/field`의 `Field`, `FieldTitle`, `FieldDescription`, `FieldLabel`, `FieldContent`, `FieldError`를 사용한다. raw HTML(`<h3>`, `<p>`, `<div>` 등)로 직접 구성하지 않는다.

## 레이아웃 여백 규칙

좌우 여백은 `PageLayout`이 단일 소스 오브 트루스다. 페이지가 직접 `px-*`로 여백을 설정하지 않는다.

**PageLayout 기준값**: `src/components/layout/page-layout.tsx` 참조

페이지 유형별 사용 방식:

| 유형                    | 사용 방식                                                       | 예시                                                                |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------- |
| 일반 콘텐츠 페이지      | `PageLayout` 사용, 페이지 자체에 `px-*` 금지                    | `shop`, `cart`, `order-form`, `reform` 등                           |
| 좁은 중앙 정렬 페이지   | `PageLayout` 미사용, 내부 컨테이너에 `px-4 sm:px-6` + `max-w-*` | `auth/login`, `payment/success·fail`, `token-purchase/success·fail` |
| 전체 화면 특수 UI       | `PageLayout` 미사용, 페이지 특성에 맞게                         | `design`(채팅 UI), `home`(랜딩·섹션별 관리)                         |
| 팝업/정책 전용 레이아웃 | 전용 레이아웃 컴포넌트 사용                                     | `shipping`(`PopupLayout`), 정책 페이지(`PolicyPageLayout`)          |

**금지 패턴**:

- `PageLayout` 안에서 최상위 `div`에 `px-*` 추가 (이중 여백 발생)
- `lg:px-0` 처럼 브레이크포인트별로 패딩을 0으로 되돌리는 패턴
- `PageLayout` 없이 일반 콘텐츠 페이지에 `mx-auto max-w-7xl px-4` 직접 작성

## 스타일 규칙

- `src/index.css`는 Tailwind CSS 테마 변수, 커스텀 유틸리티, 전역 스타일의 단일 소스 오브 트루스다.
- 새 CSS 변수(색상, 간격, 반지름 등)가 필요하면 인라인 스타일이나 별도 파일 대신 `index.css`의 `:root` 블록과 `@theme inline` 블록에 추가한다.
- 컴포넌트에서 색상·간격·폰트·반지름을 지정할 때 Tailwind 유틸리티 클래스(`bg-brand-ink`, `text-foreground-muted` 등)를 우선 사용한다. `index.css`에 정의된 변수에 매핑된 클래스가 없으면 먼저 `@theme inline`에 추가한다.
- 새 애니메이션(`@keyframes`)이나 커스텀 유틸리티가 여러 컴포넌트에서 재사용된다면 컴포넌트 내 인라인 스타일 대신 `index.css`에 추가한다.
- 다크 모드 색상 오버라이드는 `index.css`의 `.dark` 블록에서만 관리한다.
