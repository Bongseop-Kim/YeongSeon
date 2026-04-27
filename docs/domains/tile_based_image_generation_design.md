# 타일 기반 이미지 생성 시스템 설계

**날짜**: 2026-04-23 (초안) / 2026-04-24 (개정 1, 선염/날염 분기, accent 배경 프롬프트 전담, 문서 리팩터링, 재론 금지 항목 추가, 단방향 의존성 명시, v1/v2 경계 명확화) / 2026-04-24 (개정 2, 모델을 gpt-image-2 + quality=low로 확정, 타일 품질 목표를 "썸네일 스케일 자연스러움"으로 재정의, 후처리·자동 검증 영구 제외, 양산 비용 최적화 전제 명시) / 2026-04-24 (개정 3, v1/v2 정의 섹션 신설 — 기존 문서 전반에서 암묵적으로 사용되던 v1/v2 표기의 공식 정의 확정)
**상태**: 승인됨

---

## 배경 및 문제

현재 이미지 생성 시스템의 두 가지 핵심 품질 문제:

1. **OpenAI route**: 넥타이 전체 이미지를 한 번에 생성 → 타일 개념 없음, 패턴 반복 시 이질감
2. **FAL route**: 이미지 생성 후 Edge Function에서 픽셀 레벨 합성 → 합성 단계에서 품질 손실

## 해결 접근

타일 생성은 OpenAI **gpt-image-2**에 구조화된 배치 규칙 프롬프트를 전달해 **`quality: "low"`** 단일 호출로 수행한다.

핵심 아이디어:

- 타일은 반복된 결과물이 아니라 **반복의 단위(1장)**.
- 타일 내부를 2×2 invisible grid로 분할, 모티프를 각 사분면 정중앙에 배치.
- **외곽 여백 = 모티프 간 간격 / 2**가 성립하면 반복 시 간격이 균일해져 **썸네일 스케일에서 자연스러운 seamless가 성립**.
- 원단 질감(선염/날염)은 생성 단계에서 프롬프트 블록으로 내재화 (후처리 없음, POC에서 2안 생성 내재 방식이 최상 품질로 검증됨).
- **모델·품질 기본값**: `gpt-image-2` + `quality: "low"` + `size: "1024x1024"` + `output_format: "webp"` + `output_compression: 70` + `n: 1`. 타일은 갤러리/썸네일 스케일(프론트 표시 80px)에서 소비되는 **다수 생성물 중 하나**이므로 low 품질로 충분함을 설계 전제로 둔다.

---

## 문서 스코프 (v1 / v2 정의)

본 문서 전체에서 **v1**과 **v2**는 애플리케이션 릴리스 버전이 아니라 **이 설계 문서의 스코프 경계**를 가리키는 용어이다.

| 표기   | 정의                                                                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **v1** | 본 문서가 기술하고 현재 **승인된 설계·구현 범위**. 여기에 명시된 파이프라인·모델·품질·템플릿·DB 스키마·배포 전략이 모두 v1에 해당한다. 구현과 초기 배포가 이 범위 안에서 이루어진다. |
| **v2** | v1 배포·운영 이후 **실측 데이터에 근거해 재검토가 허용되는 확장 후보**의 집합. 구체 항목은 아래 "재검토가 허용된 항목"에 한정되며, 임의 확장은 이 문서의 개정이 선행되어야 한다.     |

### v1 확정 사항 (재론 금지)

아래 결정은 **v2에서도 뒤집히지 않는다.** 상세는 "재론 금지 항목" 섹션 참조.

- 타일 품질 목표 (썸네일 스케일 자연스러움, 픽셀 단위 검증 불필요)
- 이미지 후처리 미도입 (edge feathering, boundary inpaint, texture resynthesis 등)
- seamless 자동 검증 로직 미도입 (offset test, boundary MSE 등)
- 모델 선택 (`gpt-image-2`)
- 해상도 (`1024x1024`)
- 합성은 프론트엔드에서만 (Edge Function에서 픽셀 합성 없음)
- 질감은 생성 시점에 내재 (후처리 단계 없음)

### v2에서 재검토가 허용된 항목 (미결 사항과 연동)

아래 항목은 v1 실측 결과에 따라 v2에서 재검토·확장이 **허용된** 항목이다. 새로 추가되는 항목은 반드시 "미결 사항" 섹션을 통해 명시적으로 편입된다.

- 모티프 크기 비율 튜닝 (선염/날염별 최적값 포함)
- accent tile 크기 비율 매핑 실측 튜닝
- Fabric rendering 블록 어휘 확장 (`satin`, `twill` 등 세부 원단 타입 추가 여부)
- accent tile 배치 규칙 확장 (현재 "대검 하단 20% 고정" → 사용자 위치 선택 옵션)
- `gpt-image-2` API 신규 파라미터(`thinking`, `input_fidelity` 등) 선택적 도입
- 다운스케일 경로 전환 (CSS `image-rendering: auto` → Canvas API + lanczos 수동 다운스케일)

### v1/v2 경계를 벗어나는 변경

양산 원단으로 이미지가 직접 확대 사용되는 경우(예: 실제 인쇄 원고로 활용), 또는 세션당 생성 규모가 본 문서의 "양산 전제"(수십~수백 장)를 크게 벗어나는 경우는 **v1·v2 스코프를 모두 벗어나며**, 본 문서 자체의 재작성이 필요하다.

---

## 핵심 설계 원칙

- **모든 AI 생성 출력은 타일(정사각형, 1024×1024)만** — 전체 이미지 생성 완전 폐기
- **양산 전제**: 한 세션·한 사용자당 수십~수백 장의 타일이 생성될 수 있음. 타일은 갤러리/선택 UX의 작은 요소로 소비되며, 타일 단가 최소화가 품질 정밀도보다 우선한다.
- **비용 최적화 우선**: 최신 모델(`gpt-image-2`)을 최저 품질(`quality: "low"`)로 사용. "썸네일에서 자연스러움"을 넘어서는 품질 투자는 v1 스코프 밖.
- **타일 품질 목표**: "픽셀 단위 이음새 0"이 아니라 **실제 사용 맥락(프론트 80px 표시, 넥타이 캔버스 내 반복)에서 사람 눈에 자연스러운 수준**. 확대 검사·offset 수학 검증 기준이 아니며, 썸네일 스케일의 시각적 연속성만 충족하면 된다.
- **두 가지 타일 역할**:
  - **repeat tile**: 반복용. seamless 필수 (단, "썸네일 스케일 자연스러움" 기준). 올패턴과 원포인트 모두 사용.
  - **accent tile**: 원포인트용. repeat tile 배경 위에 특정 오브젝트 중앙 배치. seamless 불필요 (반복되지 않음).
- **두 가지 패턴 타입**:
  - **올패턴**: repeat tile 1개를 캔버스에 반복 배치
  - **원포인트**: repeat tile 1개(배경) + accent tile 1개, 특정 위치에만 accent 사용
- **두 가지 원단 타입**:
  - **선염(yarn-dyed)**: 자카드 조직감, 실의 짜임이 살아있는 질감
  - **날염(printed)**: 평면적 프린트, 매끈한 인쇄 느낌
- **합성은 프론트엔드** — Edge Function에서의 이미지 합성 제거
- **질감은 생성 시점에 내재** — 타일 생성 후 질감 후처리 단계 없음
- **accent 배경 일치는 프롬프트가 전담** — 프론트 후처리(페더링/그라데이션/블러/경계 처리) 도입하지 않음. 편차 발생 시 프롬프트 어휘 개선으로만 대응. v1·v2 공통 (하단 "재론 금지 항목" 참조).

---

## 생성 파이프라인

```
[1단계: 분석]
  (1-a) Edge Function: 참고 이미지가 첨부되어 있으면 분석 입력 컨텍스트에 포함
        (참고 이미지는 스타일/색상/모티프 힌트로만 활용, 별도 메트릭 평가 없음)
  (1-b) OpenAI analysis_model 호출 (gpt-4 계열):
        입력: 사용자 메시지 + 디자인 컨텍스트 + 첨부 이미지(있으면) + UI fabric 선택값
        출력: 의도, 패턴 타입, 편집 타겟,
              fabricTypeHint (yarn_dyed / printed / null),
              tileLayout (repeat tile 구성),
              accentLayout (원포인트일 때만, accent tile 구성)

[1.5단계: fabricType 최종 확정]
  Edge Function이 우선순위 규칙에 따라 fabricType 확정
  ※ 상세 규칙은 "원단 타입 판정" 섹션 참조 (단일 진실 소스)

[2단계: 프롬프트 조립]
  Edge Function이 tileLayout을 검증된 구조 템플릿
  (H / F / Q-rotation / Q-color / Q-different_motif)에 주입
  + fabricType에 따라 Fabric rendering 블록 주입 (선염용 or 날염용)
  LLM이 프롬프트 전체를 자유 생성하지 않음 (구조 품질 보장 목적).

[3단계: repeat tile 생성]
  OpenAI image_model (gpt-image-2) 호출
    파라미터: quality="low", size="1024x1024",
              output_format="webp", output_compression=70, n=1
    → 구조화된 배치 규칙 + 원단 질감 포함 프롬프트로 seamless 타일 직접 생성
    → 검증 없이 결과 확정
    (구조 템플릿 + 배치 수학 조건으로 썸네일 스케일 seamless 성립)

[4단계: accent tile 생성] — patternType이 "one_point"일 때만
  입력: repeat tile과 동일한 배경 사양 (backgroundColor, fabricType)
        + accentLayout (원포인트로 그릴 오브젝트 명세)

  생성 방식: OpenAI image_model (gpt-image-2) text2img 단일 호출
    파라미터: repeat tile과 동일 (quality="low", size="1024x1024",
              output_format="webp", output_compression=70, n=1)
    → 프롬프트: repeat tile과 동일한 배경 + 중앙에 accent 오브젝트 명시
    → 질감도 생성 시점에 내재 (repeat tile과 동일한 Fabric 블록, seamless 문구만 제거)

  설계 근거:
    POC 비교 결과 "생성 단계 내재(2안)" 방식이 합성/inpaint 방식(1안)보다
    질감 품질이 우수하여 repeat tile과 동일하게 단일 호출 text2img로 통일.

[결과]
  올패턴: repeat_tile_url
  원포인트: repeat_tile_url + accent_tile_url
  → 클라이언트 반환 → 프론트 캔버스 렌더링
```

---

## 원단 타입 판정 (선염/날염 분기)

### 개념 정의

- **선염(先染, yarn-dyed)**: 실을 먼저 염색한 후 직조 → 자카드 조직감, 실의 짜임이 살아있는 질감
- **날염(捺染, printed)**: 흰 원단 위에 패턴을 인쇄 → 평면적, 프린트 느낌

두 방식은 **생성 프롬프트의 Fabric rendering 블록 내용**으로 분기된다.
파이프라인 구조, DB 스키마 큰 틀, 프론트 렌더링은 영향 없음 (`fabric_type` 컬럼만 추가).

### 우선순위 규칙 (단일 진실 소스)

본 섹션이 fabricType 결정 로직의 **유일한 기준**이다. 다른 섹션은 이 규칙을 참조만 한다.

```typescript
function resolveFabricType(
  uiSelection: "yarn_dyed" | "printed" | null, // UI 토글/셀렉트 값
  userMessage: string, // 채팅 입력
  previousFabricType: "yarn_dyed" | "printed" | null, // 세션 이전 값
): "yarn_dyed" | "printed" {
  // 우선순위 1: 채팅 메시지 키워드 (사용자 최신 의도)
  if (matchKeyword(userMessage, YARN_DYED_KEYWORDS)) return "yarn_dyed";
  if (matchKeyword(userMessage, PRINTED_KEYWORDS)) return "printed";

  // 우선순위 2: UI 선택값
  if (uiSelection) return uiSelection;

  // 우선순위 3: 세션 이전 값 유지 (편집 중 일관성)
  if (previousFabricType) return previousFabricType;

  // 우선순위 4: 기본값
  return "printed"; // 날염이 생성 품질 편차가 작고 일반적
}
```

### 키워드 리스트

```typescript
const YARN_DYED_KEYWORDS = [
  "선염",
  "자카드",
  "자가드",
  "jacquard",
  "짜임",
  "직조",
  "원단결",
  "실크감",
  "조직감",
  "우븐",
  "woven",
];

const PRINTED_KEYWORDS = [
  "날염",
  "프린트",
  "인쇄",
  "프린팅",
  "평면",
  "매트",
  "print",
  "printed",
];
```

**판정 우선순위 근거**:

- 채팅 > UI: UI를 "선염"으로 두고도 채팅에서 "날염으로 바꿔줘"라고 하면 채팅이 최신 의도
- UI > 세션: UI 선택은 사용자가 명시적으로 한 행동
- 세션 > 기본값: 편집 중 일관성 유지

### 역할 분담

- **Edge Function**: `resolveFabricType` 실행 및 최종 확정 (결정론적)
- **LLM (analysis_model)**: `fabricTypeHint` 출력 (참고용). Edge Function의 우선순위 판정을 대체하지 않음.

### 편집 시 fabricType 변경 처리

질감이 생성 시점에 내재되므로 fabricType 변경은 부분 재생성 불가. `edit_target` 오버라이드 규칙은 **"편집 히스토리" 섹션**에 단일 정의.

---

## 프론트엔드 캔버스 렌더링

### 캔버스 기준

- TieCanvas 컴포넌트 기준: **316 × 600 px**
- 넥타이 SVG 마스크(`tie.svg`)로 실루엣 클리핑 (기존 구조 유지)

### 타일 배치

- CSS `background-repeat: repeat` 또는 Canvas API로 타일 반복 배치
- 타일 표시 크기:
  - 기본값 80px (316×600 캔버스에서 가로 약 4회, 세로 약 7-8회 반복)
  - 허용 범위 60~100px (밀도 파라미터로 제어)
  - 60px 미만: 디테일 손실 과다
  - 100px 초과: 반복 횟수 부족으로 패턴감 소실
- 다운스케일 (1024px 생성 → 표시 크기 80px, 약 12.8배):
  - 기본: CSS `image-rendering: auto`
  - 경계 아티팩트 발견 시: Canvas API + lanczos 수동 다운스케일로 전환
  - 다운스케일 비율이 커서 "미결 사항"의 품질 실측 항목으로 추적
- **올패턴**: repeat tile만 반복
- **원포인트**: repeat tile 반복 + 지정 위치에 accent tile
  - 배치 규칙 (v1):
    - 위치: 대검(넥타이 넓은 끝) 하단 20% 지점
    - 크기: 캔버스 너비의 약 40% (126px 정사각형, 타일 표시 크기와 독립)
    - 금지 영역: 상단 30% (매듭 가림), 중앙 (벨트/셔츠 가림)
  - v2에서 사용자 위치 선택 옵션 추가 검토

### UI 구성요소

원단 선택 토글은 채팅 입력창(`chat-input.tsx`)에 이미 구현되어 있다.

- 위치: 채팅 입력창 하단 좌측, 전송 버튼 좌측
- 선택지: `선염 (직조)` (`yarn-dyed`) / `날염 (프린팅)` (`print`) 2지 라디오
- `designContext.fabricMethod` 값으로 관리, `toTileFabricType()`을 통해 Edge Function에 `uiFabricType`으로 전달
- 기본 선택값: 세션 이전 값(`previousFabricType`) → 없으면 Edge Function 내 `resolveFabricType` 기본값(`"printed"`)
- 채팅 키워드는 Edge Function의 `resolveFabricType` 우선순위 1로 처리되어 실제 생성에 반영된다. UI 토글은 사용자가 명시적으로 선택한 값을 유지하는 역할로 기존 컴포넌트를 그대로 활용한다.

---

## 라우팅 변경

### 기존 route 전면 폐기

| 기존 route       | 변경                                    |
| ---------------- | --------------------------------------- |
| `openai`         | 폐기 → 신규 파이프라인으로 통합         |
| `fal_tiling`     | 폐기 → 신규 파이프라인으로 통합         |
| `fal_edit`       | 폐기 → 타일 편집 플로우로 통합          |
| `fal_controlnet` | 폐기 → 신규 파이프라인으로 통합         |
| `fal_inpaint`    | 폐기 → 타일 단위 inpaint로 통합         |
| `gemini`         | 분석 단계에서 완전 제거 (OpenAI로 통일) |

### 신규 route와 Edge Function 대응

| Route             | 처리 Edge Function | 용도                                        |
| ----------------- | ------------------ | ------------------------------------------- |
| `tile_generation` | `generate-tile`    | 타일 신규 생성 (올패턴/원포인트 모두)       |
| `tile_edit`       | `generate-tile`    | 기존 타일 기반 편집 (채팅으로 수정 요청 시) |

Edge Function은 `generate-tile` **1개**가 두 route를 모두 처리한다. `intent` 필드(`new` | `edit`)로 내부 분기.

> Route 신호 체계(클라이언트 → Edge Function 요청 페이로드 스키마)의 세부는 구현 단계 확정. 위 표는 route → Edge Function 매핑 확정분.

---

## 타일 상태 관리

### Zustand 스토어 추가 필드

```typescript
// design-chat-store.ts 추가
repeatTile: { url: string; workId: string } | null
accentTile: { url: string; workId: string } | null
patternType: "all_over" | "one_point" | null
fabricType: "yarn_dyed" | "printed" | null
```

### ai_generation_logs 추가 컬럼

```sql
repeat_tile_url      TEXT    -- 반복 타일 ImageKit URL
repeat_tile_work_id  TEXT    -- 반복 타일 work_id
accent_tile_url      TEXT    -- accent 타일 ImageKit URL (원포인트만)
accent_tile_work_id  TEXT    -- accent 타일 work_id (원포인트만)
pattern_type         TEXT    -- "all_over" | "one_point"
fabric_type          TEXT    -- "yarn_dyed" | "printed"
tile_role            TEXT    -- "repeat" | "accent"
paired_tile_work_id  TEXT    -- 짝 타일의 work_id (원포인트만)
accent_layout_json   JSONB   -- accent 생성 시 사용한 accentLayout (재생성 시 재사용)
```

### design_sessions 추가 컬럼

```sql
repeat_tile_url      TEXT
repeat_tile_work_id  TEXT
accent_tile_url      TEXT
accent_tile_work_id  TEXT
pattern_type         TEXT
fabric_type          TEXT
```

세션 복원 시 타일 상태 + fabric_type 함께 복원.

### 편집 히스토리

편집 단위: 타일 단위 (repeat tile과 accent tile은 독립된 work_id 체인)

`ai_generation_logs` 컬럼 의미 명확화:

```
work_id              이 로그에서 생성된 타일의 고유 ID
parent_work_id       직전 편집 타일의 work_id (히스토리 체인)
base_image_work_id   최초 원본 타일의 work_id (루트 추적)
tile_role            "repeat" | "accent" — 이 로그가 어느 타일을 생성했는지
paired_tile_work_id  짝 타일의 work_id (원포인트만, NULL 허용)
fabric_type          이 타일이 어떤 원단 타입으로 생성되었는지
```

편집 라우팅 (analysis_model이 판정):

```
edit_target: "repeat" | "accent" | "both" | "new"

"repeat"  → repeat tile 재생성 + accent 자동 재생성 (단방향)
              근거: repeat tile의 배경 사양이 바뀌면 accent 배경과 불일치 발생
                    → accent를 새 repeat 배경 기준으로 재생성해야 연속성 유지
              accent 재생성: 저장된 accentLayout으로 동일 오브젝트 재생성
                             (배경 사양은 새 repeat tile 기준으로 갱신)
              → 오브젝트 형상은 보존, 배경 톤만 새 repeat tile과 맞춤
"accent"  → accent만 재생성 (accentLayout 수정 내용 반영), repeat tile work_id 유지
              근거: accent 변경은 repeat 배경에 영향을 주지 않음 (단방향의 반대 방향은 성립 안 함)
"both"    → 둘 다 재생성
"new"     → 완전 신규 (히스토리 체인 끊김)
              ※ 신규 세션 생성 경로와 구분: "new"는 현재 세션 내에서 히스토리만 끊는
                것이고, 레거시 세션 마이그레이션은 별도의 "새 세션 생성" 경로 사용
                (하단 "마이그레이션 전략" 참조).

[fabricType 변경 감지 오버라이드 — 단일 정의]
이전 fabricType !== 신규 fabricType인 경우:
  edit_target을 "both"로 강제 승격 (질감 내재 특성상 부분 재생성 불가)
  → 사용자에게 "원단 타입 변경 시 전체 재생성됩니다" 안내 UI 표시 권장
```

세션 상태 (`design-chat-store.ts`)는 "현재 활성 타일 쌍"만 유지:

```typescript
repeatTile: { url, workId }
accentTile: { url, workId } | null
patternType: "all_over" | "one_point"
fabricType: "yarn_dyed" | "printed"
```

제약 조건 (단방향 의존성):

- repeat tile 편집 시 **accent도 반드시 재생성** (배경 연속성 유지 필수)
- accent 편집 시 **repeat tile은 불변** (accent → repeat 역방향 의존 없음)
- fabricType 변경 시 repeat tile + accent 모두 재생성 필수

---

## Edge Function 변경

### 폐기

- `generate-google-api` — Gemini 분석 포함 전면 폐기
- `prepare-pattern-composite` — 폐기
- `generate-fal-api` — 폐기
- `generate-open-api` — 폐기

### 신규: `generate-tile`

단일 Edge Function이 `tile_generation`과 `tile_edit` 두 route를 모두 처리.

처리 단계:

1. **OpenAI analysis_model 분석** — `tileLayout` + `accentLayout` + `fabricTypeHint` 포함한 structured output
2. **fabricType 최종 확정** — `resolveFabricType` 실행
3. **프롬프트 조립** — repeat tile 및 (조건부) accent tile 프롬프트 생성
4. **OpenAI image_model 호출** — repeat tile 생성
5. **OpenAI image_model 호출** — accent tile 생성 (원포인트 조건부)
6. **결과 반환** — tile URL(s) + 메타데이터(fabric_type, accentLayout 포함)

### Edge Function 런타임 제약

- 런타임: Supabase Edge Runtime (Deno 기반, TypeScript)
- 이미지 생성 모델: `gpt-image-2` 고정. `quality="low"`, `size="1024x1024"`, `output_format="webp"`, `output_compression=70`, `n=1`
- 모든 단계가 OpenAI API 호출만 사용 (이미지 처리 연산 없음)
- Sharp / PIL / WASM 등 이미지 라이브러리 의존성 전무
- 메모리 사용량: OpenAI 응답 1024×1024 WebP 버퍼만 일시 보유 후 Storage/ImageKit 업로드 (저용량, webp+compression 70으로 전송/저장 비용 최소화)

---

## 분석 단계 (OpenAI analysis_model)

### 역할 분담

**Edge Function (결정론적):**

- `resolveFabricType` 실행 (우선순위 규칙은 "원단 타입 판정" 섹션 참조)
- analysis_model 출력 `tileLayout`을 검증된 repeat tile 템플릿에 주입
- analysis_model 출력 `accentLayout`을 accent tile 템플릿에 주입 (원포인트일 때만)
- fabricType에 맞는 Fabric rendering 블록을 각 템플릿에 주입

**analysis_model (의미 해석):**

- 사용자 의도 파악 (신규 생성 vs 편집)
- 패턴 타입 분류 (올패턴 vs 원포인트)
- 편집 타겟 판정 (`repeat` | `accent` | `both` | `new`)
- repeat tile 내부 구성 판정 (structure / variation / motifs / backgroundColor)
- accent tile 오브젝트 판정 (원포인트일 때만, accentLayout)
  - 채팅에서 원포인트 오브젝트 명세 추출
  - 첨부 이미지가 있으면 오브젝트 힌트로 활용
  - 둘 다 있으면 조합 가능 (예: "배경은 스트라이프, 첨부 이미지를 원포인트로")
- fabricType 힌트 출력 (참고용)

> 첨부 이미지는 분기 기준이 아니라 스타일/오브젝트 힌트 입력으로만 활용.
> 별도 메트릭 평가 없음. analysis_model이 이미지를 그대로 보고 판단.

### Output Schema

```typescript
{
  // 의도 판정
  intent: "new" | "edit",
  patternType: "all_over" | "one_point",
  editTarget: "repeat" | "accent" | "both" | "new",

  // 원단 타입 힌트 (Edge Function이 최종 확정)
  fabricTypeHint: "yarn_dyed" | "printed" | null,

  // repeat tile 내부 구성 (항상 존재)
  tileLayout: {
    structure: "H" | "F" | "Q",
    variation: "rotation" | "color" | "different_motif" | null,
    // H, F → null
    // Q → rotation | color | different_motif 중 하나

    motifs: Motif[],
    // H: 길이 1
    // F: 길이 1 (2개 배치되지만 동일하므로 정의는 1개)
    // Q-rotation: 길이 1 (4개 배치되지만 동일 모티프, 방향만 다름)
    // Q-color: 길이 1, motif.colors에 [색상A, 색상B] 2개 지정
    // Q-different_motif: 길이 2

    backgroundColor: string,  // 예: "plain navy blue", "cream"
  },

  // accent tile 오브젝트 명세 (patternType === "one_point"일 때만, 그 외 null)
  accentLayout: {
    objectDescription: string,
    // 오브젝트 자연어 명세
    // 예: "a gold anchor", "a whale shape in cream",
    //     "the attached logo image" (첨부 이미지 참조 시)

    objectSource: "text" | "image" | "both",
    // "text":  채팅 텍스트만으로 오브젝트 정의
    // "image": 첨부 이미지를 오브젝트로 활용
    // "both":  텍스트 + 이미지 조합 (예: "첨부 이미지를 네이비 톤으로")

    color?: string,  // 오브젝트 색상 (objectSource가 "image"가 아닐 때 선택)
    size?: "small" | "medium" | "large",  // accent tile 내 크기 힌트
  } | null
}

type Motif = {
  name: string,              // 예: "cherry", "anchor", "pine tree"
  color?: string,            // Q-color가 아닌 경우 단일 색상
  colors?: [string, string], // Q-color인 경우 [색상A, 색상B]
}
```

### 사용자 표현 → 구조/variation 매핑

| 사용자 표현                                      | structure | variation       |
| ------------------------------------------------ | --------- | --------------- |
| "심플하게", "깔끔하게", "포인트로" + 단일 모티프 | H         | null            |
| "엇갈리게", "대각으로" + 단일 모티프             | F         | null            |
| 단일 모티프만 언급 (기본값)                      | F         | null            |
| "방향 다르게", "회전", "돌아가는" + 단일 모티프  | Q         | rotation        |
| "색 섞어서", "두 가지 색으로" + 단일 모티프      | Q         | color           |
| 두 종류 모티프 명시 (예: "닻이랑 키")            | Q         | different_motif |

### 결정 흐름 예시

- "전체적으로 돌고래 뿌리고, 파도 모양을 원포인트로"
  → `patternType: "one_point"`, `tileLayout.motifs: [{name: "dolphin"}]`,
  `accentLayout: {objectDescription: "a wave shape", objectSource: "text"}`

- "첨부 이미지를 원포인트로 해줘" (스트라이프 사전 설정 있음)
  → `patternType: "one_point"`, `tileLayout: { /* 기존 스트라이프 */ }`,
  `accentLayout: {objectDescription: "the attached image", objectSource: "image"}`

- "배경을 스트라이프로 하고 첨부 이미지를 네이비 톤으로 원포인트"
  → `patternType: "one_point"`, `tileLayout: { /* 스트라이프 */ }`,
  `accentLayout: {objectDescription: "the attached image in navy tone", objectSource: "both"}`

### 분석 단계 안정성

analysis_model 호출은 structured output 강제 (JSON schema 검증).

파싱 실패 시 기본값 라우팅:

```
edit_target = "new"
patternType = "all_over"
fabricTypeHint = null  (Edge Function resolveFabricType으로 처리)
tileLayout.structure = "F"
tileLayout.variation = null
accentLayout = null
```

LLM 판정 전 결정론적 룰 오버라이드 (Edge Function에서 선처리):

- 사용자 메시지 키워드로 `edit_target` 확정
  - `"배경만"` / `"패턴만"` → `edit_target = "repeat"`
  - `"포인트만"` / `"로고만"` / `"이것만"` → `edit_target = "accent"`
  - (전체 키워드 리스트는 구현 단계 확정)
- fabricType 키워드 매칭도 LLM 호출 전 수행 (`resolveFabricType` 우선순위 1)

---

## 타일 생성 템플릿 체계

### 구조 분기 (3개) × variation (Q만 3개)

| 템플릿                | 모티프 배치                               | variation       | 사용자 표현 예시                                 |
| --------------------- | ----------------------------------------- | --------------- | ------------------------------------------------ |
| **H (single)**        | 1개 중앙                                  | 없음            | "심플하게", "깔끔하게", "포인트로" + 단일 모티프 |
| **F (pair)**          | 2개 대각, 나머지 사분면 비움              | 없음            | "엇갈리게", "대각으로", 단일 모티프 기본값       |
| **Q-rotation**        | 2×2 그리드, 모두 동일 모티프, 방향만 다름 | rotation        | "방향 다르게", "회전", "돌아가는"                |
| **Q-color**           | 2×2 그리드, 대각 쌍끼리 색 다름           | color           | "색 섞어서", "두 가지 색으로"                    |
| **Q-different_motif** | 2×2 그리드, 대각 쌍끼리 모티프 종류 다름  | different_motif | "A랑 B 같이" (2종 명시)                          |

### 원단 분기 (2개)

| FabricType           | 특징                              | 프롬프트 차이                                     |
| -------------------- | --------------------------------- | ------------------------------------------------- |
| **yarn_dyed (선염)** | 자카드 조직감, 실이 짜여있는 질감 | 모티프가 직조 구조의 일부로 표현, 실의 결 visible |
| **printed (날염)**   | 평면적, 인쇄 느낌                 | 모티프가 원단 위 잉크로 표현, 매끈한 색면         |

### 배치 수학적 근거

타일을 2×2 invisible grid로 분할 시:

- 외곽 여백 = 모티프 간 간격 / 2

반복 시 타일 경계를 넘어간 모티프 간 간격 = 외곽 여백(왼쪽 타일의 우측 여백) + 외곽 여백(오른쪽 타일의 좌측 여백) = 모티프 간 간격과 동일.
→ 이 조건을 프롬프트로 명시하면 seamless가 구조적으로 성립 (경계 봉합 단계 불필요).

구체 좌표(1024 기준 (256,256), (768,256), (256,768), (768,768))는 프롬프트에 직접 들어가지 않으며, 원칙 검증용 부록으로만 보존.

### Fabric rendering 블록 — 단일 정의

본 섹션이 Fabric 블록의 **유일한 정의**. repeat tile과 accent tile 양쪽에서 이 블록을 공유하고, accent tile 주입 시에만 하단 `Seamless requirement` suffix를 제거한다.

**yarn_dyed 블록**

```
Fabric rendering (critical):
- Entire surface is realistic yarn-dyed tie silk jacquard fabric, top-down flat view.
- Visible woven warp and weft threads with subtle natural sheen.
- Motifs appear as woven into the fabric structure (not printed on top) —
  the pattern emerges from the weave itself, with thread-level texture visible
  on both the motifs and the background.
```

**printed 블록**

```
Fabric rendering (critical):
- Entire surface is printed tie silk fabric, top-down flat view.
- Smooth matte surface with flat color fields.
- Motifs appear as ink printed on top of the silk base — crisp edges, uniform color fill,
  no thread-level texture within the motifs or background.
- Very subtle fabric base grain may be visible but must remain uniform across the tile.
```

**Seamless requirement suffix (repeat tile에만 주입)**

```
- The fabric surface must tile seamlessly on all four edges:
  left edge matches right edge, top edge matches bottom edge.
- No directional weave/grain bias, no visible texture seam at any edge when the tile is repeated.
```

**조립 규칙**:

- repeat tile: `{FABRIC_BLOCK}` = 원단 블록 + Seamless suffix
- accent tile: `{FABRIC_BLOCK}` = 원단 블록만 (Seamless suffix 없음)

### 프롬프트 템플릿 (repeat tile)

각 구조 템플릿의 `{FABRIC_BLOCK}`에 위 조립 규칙대로 주입.

**H (single)**

```
Square tile 1024x1024 with exactly 1 {모티프} on plain {배경색} tie silk fabric.

Placement rule (critical):
- The {모티프} is placed at the exact geometric center of the tile.
- Equal margin on all four sides (top margin = bottom margin = left margin = right margin).
- No other elements anywhere in the tile, including corners and edges.

{FABRIC_BLOCK}

Motif size: about 45% of the tile width.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.
```

**F (pair)**

```
Square tile 1024x1024 with exactly 2 identical {모티프} on plain {배경색} tie silk fabric.

Placement rule (critical):
- Divide the tile into a 2x2 invisible grid (four equal quadrants).
- Place one {모티프} at the exact center of the upper-left quadrant.
- Place one {모티프} at the exact center of the lower-right quadrant.
- Upper-right and lower-left quadrants are completely empty.
- Each motif is centered within its quadrant with equal margin on all four sides of that quadrant.

{FABRIC_BLOCK}

Each motif size: about 35% of the tile width.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.
```

**Q-rotation**

```
Square tile 1024x1024 with exactly 4 {모티프} on plain {배경색} tie silk fabric.

Placement rule (critical):
- Divide the tile into a 2x2 invisible grid (four equal quadrants).
- Place one {모티프} at the exact center of each quadrant.
- Each motif is centered within its quadrant, with equal margin on all four sides of its quadrant.
- Distance from any motif to the tile edge equals half the distance between two adjacent motifs.

Rotation rule (critical):
- All 4 motifs are the same motif (identical shape, identical size, identical color).
- Upper-left quadrant: rotated 0 degrees.
- Upper-right quadrant: rotated 90 degrees clockwise.
- Lower-right quadrant: rotated 180 degrees.
- Lower-left quadrant: rotated 270 degrees clockwise.

{FABRIC_BLOCK}

Each motif size: about 35% of the tile width.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.
```

**Q-color**

```
Square tile 1024x1024 with exactly 4 {모티프} on plain {배경색} tie silk fabric.

Placement rule (critical):
- Divide the tile into a 2x2 invisible grid (four equal quadrants).
- Place one {모티프} at the exact center of each quadrant.
- Each motif is centered within its quadrant, with equal margin on all four sides of its quadrant.
- Distance from any motif to the tile edge equals half the distance between two adjacent motifs.

Color rule (critical):
- All 4 motifs are the same shape, same size, same orientation.
- Upper-left and lower-right: {색상A}.
- Upper-right and lower-left: {색상B}.

{FABRIC_BLOCK}

Each motif size: about 35% of the tile width.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.
```

**Q-different_motif**

```
Square tile 1024x1024 with exactly 4 motifs on plain {배경색} tie silk fabric.

Placement rule (critical):
- Divide the tile into a 2x2 invisible grid (four equal quadrants).
- Upper-left quadrant: one {모티프A} at the exact center.
- Lower-right quadrant: one {모티프A} at the exact center (identical to upper-left).
- Upper-right quadrant: one {모티프B} at the exact center.
- Lower-left quadrant: one {모티프B} at the exact center (identical to upper-right).
- Each motif is centered within its quadrant with equal margin on all four sides of that quadrant.
- Distance from any motif to the tile edge equals half the distance between two adjacent motifs.

{FABRIC_BLOCK}

Each motif size: about 30% of the tile width.
Flat 2D top-down view, no shadow, no text, no border.
```

### 프롬프트 템플릿 (accent tile)

accent tile은 seamless 속성이 불필요하며, 단일 오브젝트가 중앙에 배치되는 구조.
`{FABRIC_BLOCK}`은 Seamless suffix를 제외한 원단 블록만 주입.

**accent-text (objectSource가 "text"인 경우)**

```
Square tile 1024x1024 on plain {배경색} tie silk fabric.

Subject:
- {오브젝트 설명}, placed at the exact geometric center of the tile.
- Object size: about {크기 비율}% of the tile width.
- {색상 지정이 있을 경우: Object color: {오브젝트 색상}.}

Background:
- Plain {배경색} covering the entire tile outside of the central object.
- No additional motifs, patterns, or decorations anywhere on the background.
- Background tone, brightness, and fabric treatment must match the repeat tile's background exactly.

{FABRIC_BLOCK}

Flat 2D top-down view, no shadow, no text, no border, no additional decoration.
```

**accent-image (objectSource가 "image" 또는 "both"인 경우)**

image_model의 이미지 입력 기능을 활용. 첨부 이미지가 생성 요청에 포함되며 프롬프트로 의도를 보강.

```
Square tile 1024x1024 on plain {배경색} tie silk fabric.

Subject:
- Reproduce the attached reference image as a single decorative element at the exact geometric center of the tile.
- {"both"일 경우 추가 지시: {색상 변경 / 스케일 / 스타일 조정 등 텍스트 보강 내용}.}
- Object size: about {크기 비율}% of the tile width.

Background:
- Plain {배경색} covering the entire tile outside of the central object.
- No additional motifs, patterns, or decorations anywhere on the background.
- Background tone, brightness, and fabric treatment must match the repeat tile's background exactly.

{FABRIC_BLOCK}

Flat 2D top-down view, no shadow, no text, no border, no additional decoration.
```

### 크기 비율 가이드

repeat tile과 accent tile의 크기 체계는 **독립**이다 (repeat은 구조별 고정, accent는 사용자 지정 가능).

| 대상                 | 크기 결정 방식           | 값                                              |
| -------------------- | ------------------------ | ----------------------------------------------- |
| repeat tile 모티프   | 템플릿별 고정            | H 45%, F·Q 35%, Q-different_motif 30%           |
| accent tile 오브젝트 | `accentLayout.size` 매핑 | `small` 30% / `medium` 45% (기본) / `large` 60% |

### 프롬프트 조립 로직

Edge Function은 analysis_model 결과 `tileLayout` / `accentLayout` + 확정된 `fabricType`을 받아 검증된 템플릿에 값을 주입. LLM이 프롬프트 전체를 자유 생성하지 않는 이유:

- 검증된 프롬프트 구조의 재현성 보장
- 토큰 절약
- 디버깅 용이 (어떤 템플릿 × 어떤 원단 타입을 썼는지 명확)

```typescript
function buildRepeatPrompt(
  layout: TileLayout,
  fabricType: "yarn_dyed" | "printed",
): string {
  const structureTemplate = selectTemplate(layout.structure, layout.variation);
  const baseFabricBlock =
    fabricType === "yarn_dyed" ? YARN_DYED_FABRIC_BLOCK : PRINTED_FABRIC_BLOCK;
  const fabricBlock = baseFabricBlock + "\n" + SEAMLESS_SUFFIX;

  return structureTemplate
    .replace("{FABRIC_BLOCK}", fabricBlock)
    .replace(/{모티프}/g, layout.motifs[0].name)
    .replace("{배경색}", layout.backgroundColor);
  // variation별 추가 치환 (색상A/B, 모티프A/B 등)
}

function buildAccentPrompt(
  accentLayout: AccentLayout,
  backgroundColor: string, // repeat tile과 동일하게 주입
  fabricType: "yarn_dyed" | "printed",
): { prompt: string; referenceImage?: string } {
  const template =
    accentLayout.objectSource === "text"
      ? ACCENT_TEXT_TEMPLATE
      : ACCENT_IMAGE_TEMPLATE;
  const fabricBlock =
    fabricType === "yarn_dyed"
      ? YARN_DYED_FABRIC_BLOCK // seamless suffix 없음
      : PRINTED_FABRIC_BLOCK;

  const sizeRatio = SIZE_RATIO_MAP[accentLayout.size ?? "medium"];

  const prompt = template
    .replace("{FABRIC_BLOCK}", fabricBlock)
    .replace("{배경색}", backgroundColor)
    .replace("{오브젝트 설명}", accentLayout.objectDescription)
    .replace("{크기 비율}", String(sizeRatio));
  /* 색상 블록 조건부 치환 등 */
  return {
    prompt,
    referenceImage:
      accentLayout.objectSource !== "text" ? attachedImageUrl : undefined,
  };
}
```

### seamless 품질 보장 전략

**자동 검증 단계 불필요.** 프롬프트 설계만으로 **썸네일 스케일의 자연스러운 seamless**를 성립시킨다. 픽셀 단위 완벽 seamless는 v1·v2 모두 추구 대상 아님.

근거:

- POC에서 gpt-image-1이 구조화된 배치 규칙 프롬프트에 대해 육안 기준 안정적 seamless 확인. gpt-image-2는 O-시리즈 reasoning 내장으로 그리드·간격 제약 준수도가 동등 이상 예상.
- **외곽 여백 = 모티프 간 간격 / 2** 수학 조건을 프롬프트로 명시하면 반복 시 간격이 균일해져 **썸네일 스케일에서 이음새가 인지되지 않음**.
- 프론트 표시 80px(생성 1024px의 약 1/12.8 스케일)에서는 픽셀 단위 경계 불일치가 다운스케일로 자연스럽게 마스킹됨.

**실패 사례 대응**:

- 사용자가 결과물이 마음에 들지 않을 경우 → 채팅으로 재요청 (편집 플로우, n=1 재생성)
- 반복적으로 seamless가 깨지는 패턴 발견 시 → 해당 템플릿 프롬프트 개선 배포
- 운영 로그에 생성 프롬프트 + 결과 URL 기록하여 품질 이슈 추적
- offset test / boundary MSE / edge feather 등 자동 품질 검증 및 후처리는 **도입하지 않음** (재론 금지 항목 참조)

---

## 마이그레이션 전략

### 레거시 데이터 처리

**`ai_generation_logs` 기존 행:**

- `tile_role`, `paired_tile_work_id`, `accent_layout_json`, `fabric_type` 전부 NULL 허용
- `tile_role IS NULL` → 레거시 로그로 판정, 신규 파이프라인에서 참조 대상 아님
- 일괄 마이그레이션 없음, 레거시 그대로 보존

**`design_sessions` 기존 행:**

- `repeat_tile_url`, `fabric_type` 등 신규 컬럼 NULL 허용
- `repeat_tile_url IS NULL` → 레거시 세션으로 판정
- 레거시 세션 열기 → 읽기 전용 표시, 신규 편집은 **새 세션 생성** 유도
  - 이 "새 세션 생성"은 `edit_target = "new"`와 별개 경로
    - `edit_target = "new"`: 현재 세션 내에서 히스토리 체인만 끊음
    - 레거시 세션 → 새 세션: 세션 레코드 자체를 신규 생성 (레거시 세션은 읽기 전용 유지)

### 배포 전략 (점진적 롤아웃)

| Phase   | 내용                                                             | 안전성                                     |
| ------- | ---------------------------------------------------------------- | ------------------------------------------ |
| Phase 1 | 신규 컬럼 추가 (NULL 허용), 기존 route 유지                      | 롤백 안전, 사용자 영향 없음                |
| Phase 2 | 신규 `generate-tile` Edge Function 배포, 내부/베타 사용자만 노출 | 기존 route 유지                            |
| Phase 3 | 신규 세션은 신규 route, 레거시 세션은 레거시 route로 분기        | 신규/레거시 공존                           |
| Phase 4 | 최소 2주 Phase 3 가동 확인 후 레거시 route 폐기                  | 레거시 세션은 읽기 전용으로 계속 접근 가능 |

### 롤백 시나리오

- **Phase 2, 3**: 라우팅 플래그만 되돌리면 즉시 레거시 복귀 (DB 호환)
- **Phase 4 이후**: 레거시 Edge Function 복구 필요, 롤백 비용 큼
  → Phase 4 진입 전 Phase 3 최소 2주 가동 필수

---

## 미결 사항 (구현 단계에서 확정)

- Route 신호 체계 세부 (클라이언트 → `generate-tile` 요청 페이로드 스키마)
- **gpt-image-2 `quality: "low"`에서 썸네일 스케일 시각 품질 실측** — 갤러리 UI에서 자연스러움이 유지되는지, medium/high 대비 육안 차이가 판매 전환에 영향을 주는지 A/B
- **세션당 평균 타일 생성 수 실측** — 양산 전제(수십~수백 장)의 실제 범위 확인, 월 운영 비용 모델 확정
- 모티프 크기 비율 튜닝 (현재: H 45%, F·Q 35%, Q-different_motif 30%)
  → 넥타이 표시 크기(60~100px) 환산 시 가독성 기준으로 재조정 가능성
  → 선염/날염별 최적 비율 차이 여부 검증
- accent tile 크기 비율 매핑 (small 30% / medium 45% / large 60%) 실측 튜닝
- accent tile 배경 톤을 repeat tile과 맞추기 위한 프롬프트 어휘 튜닝
  (프롬프트로만 해결, 프론트 후처리 없음)
- 1024 → 80px 다운스케일 품질 실측 (경계 아티팩트 발생 빈도, lanczos 전환 임계점)
  → low quality + webp compression 70 조합에서의 다운스케일 아티팩트 양상 확인
- analysis_model system prompt의 구체 few-shot 예시 구성
  → 특히 `accentLayout.objectSource` 판정 예시 (text / image / both)
- Fabric rendering 블록 어휘 튜닝
  → "tie silk jacquard" 외 "satin", "twill" 등 세부 원단 타입 도입 여부 (v2)
  → 선염/날염 블록의 구체 표현 A/B 테스트
  → gpt-image-2 low quality에서 템플릿 어휘 난이도가 적절한지 검증
- fabricType 키워드 리스트 전수 정리
- fabricType 변경 시 전체 재생성 안내 UI/UX 명세
- 첨부 이미지를 image_model에 전달하는 포맷 및 크기 제한 확인 (gpt-image-2 `/v1/images/edits` 사양)
- `edit_target` 오버라이드용 명시 키워드 전체 리스트 확정
- `gpt-image-2` API 신규 파라미터(`thinking`, `input_fidelity` 등) 적용 여부 — v1은 기본값 사용, 필요 시 v2에서 재검토

---

## 진단 시 재론 금지 항목 (설계 확정)

본 섹션의 항목들은 POC/운영 경험과 비즈니스 맥락(양산 전제, 썸네일 스케일 소비)을 거쳐 **설계 결정으로 확정**된 사항이다. 향후 문서 리뷰나 취약점 진단 시 이 항목들은 "약점"으로 재론되지 않는다.

- **타일 품질 목표**: 타일은 갤러리/썸네일 스케일(프론트 80px)에서 다수 소비되는 작은 요소이므로, "픽셀 단위 seamless"나 "텍스처 경계 보정"은 불필요. 사람 눈에 자연스러운 수준이면 충족. 확대·offset 기반의 "완벽성" 기준은 이 제품의 사용 맥락에 해당하지 않음.
- **seamless 품질 검증**: 자동 검증 단계 불필요. POC에서 프롬프트 설계만으로 품질 확보 검증 완료. offset test, boundary MSE, seam line detection 등 자동 검증 로직은 도입하지 않음.
- **이미지 후처리**: edge feathering, boundary inpaint, texture resynthesis, 경계 블렌딩 등 어떠한 이미지 후처리도 v1·v2에서 도입하지 않음. 양산 원단으로 확대 사용이 결정되는 시점(=본 문서의 전제를 벗어나는 시점)에만 재검토. 이전 문서 개정의 "v2 이후 재검토 가능" 단서는 철회됨.
- **accent 배경 일치**: 프롬프트로만 해결. 편차 발생 시 프롬프트 어휘 개선으로 대응 (위 "이미지 후처리" 항목의 특수 사례).
- **모델 선택**: `gpt-image-2` + `quality: "low"`로 고정. mini/1.5/기타 fal 경유 등은 비용·품질 동시 역전 상황이 아니므로 선택지 아님. gpt-image-3 이상 차세대 모델 출시 시에만 재검토.
- **해상도**: `size: "1024x1024"` 고정. gpt-image-2 API 제약(변 16배수, 총 픽셀 ≥655,360)상 더 작은 해상도 생성으로의 비용 절감은 불가. 프론트 표시 크기 축소가 더 큰 비용 효과를 가진다면 그쪽으로 대응.
- **OpenAI API 실패 처리**: 표준 재시도(exponential backoff, 최대 3회) + 최종 실패 시 사용자에게 에러 메시지.
