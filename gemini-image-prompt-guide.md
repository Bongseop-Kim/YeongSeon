# Gemini 이미지 생성 프롬프트 가이드

> 조사일: 2026-03-08
> 적용 모델: `gemini-2.5-flash-image` (현재 프로젝트 사용 중)

---

## 핵심 원칙

> **"장면을 설명하라. 키워드만 나열하지 마라."**
> 서술적인 단락이 연결되지 않은 단어 목록보다 일관된 이미지를 생성한다.

- 이미지의 **목적/맥락**을 설명하면 더 좋은 결과가 나온다
  예: "고급 미니멀 스킨케어 브랜드 로고" → 단순 "로고 만들어줘"보다 우수
- **반복 정제(iterative refinement)** 활용 — 첫 결과가 완벽하지 않아도 대화로 수정
- 복잡한 프롬프트는 **사고 모드(thinking mode)** 가 기본 활성화되어 추론함

---

## 효과적인 프롬프트 구조

```
[무엇을] + [어떤 상태로] + [어디서] + [어떻게 보이는지] + [기술적 세부사항]
```

| 카테고리      | 프롬프트 전략                              |
| ------------- | ------------------------------------------ |
| 사실적 장면   | 카메라 각도, 렌즈 종류, 조명 세부사항 명시 |
| 일러스트      | 스타일, 선 작업, 음영, 배경 투명도 명시    |
| 텍스트 포함   | 글꼴 스타일, 디자인 요소 상세 기술         |
| 제품 사진     | 스튜디오 조명, 각도, 소재 디테일           |
| 패턴/텍스타일 | 실제 직물 레퍼런스 비유 + 시각적 묘사      |

---

## 위치 제어 (Spatial Positioning)

### 핵심 결론

| 기법                                | 실현 가능성      | 비고                                     |
| ----------------------------------- | ---------------- | ---------------------------------------- |
| 수치 좌표 (`55% from left`)         | 낮음             | 모델이 무시하거나 결과 일관성 없음       |
| 자연어 방향 서술어                  | 높음 (공식 권장) | `"lower-right corner"`, `"top third"` 등 |
| 그리드/삼분법 표현                  | 중간~높음        | `"bottom third"`, `"right quadrant"`     |
| Bounding box (분석→생성 파이프라인) | 높음             | 이미지 분석 시 0–1000 좌표 공식 지원     |

> **`"55% from left, 80% from top"` 같은 수치 좌표는 공식 미지원.**
> 모델이 일관되게 따르지 않는다. 공식 Google 문서도 "텍스트/요소 위치는 시도 가능하나 결과가 일관되지 않을 수 있다"고 명시한다.

### 작동하는 위치 표현 방식

#### 방향 서술어 (가장 효과적)

```
"a logo positioned in the lower-right corner"
"text anchored to the upper-left quadrant"
"subject centered in the frame with empty space in the lower third"
"slightly off-center to the right, in the lower portion of the fabric"
```

#### 삼분법/사분법 그리드

```
"placed in the bottom third of the image"
"occupying the top-right quadrant"
"centered along the vertical axis, shifted toward the lower-right"
```

#### 공간 관계어

```
"nestled between X and Y"
"in the foreground, slightly off-center to the right"
"close to the bottom edge but not at the very edge"
```

### 현재 프로젝트 one-point CI 배치 적용

원단 이미지(9:16)에서 CI 로고를 중앙 하단보다 살짝 우측 위에 고정하려면:

```
"slightly right of center and in the lower portion of the fabric
 — positioned about one-third from the bottom, offset to the right of the vertical centerline"
```

수치 좌표(`55%`, `80%`)는 신뢰할 수 없으므로 이 방향 서술어 방식이 더 일관된 결과를 낸다.

---

## 패턴 밀도/스케일 제어

### 문제: 숫자만으로는 효과 없음

```
❌ "render approximately 300 motifs (roughly 17-18 per row)"
✓  "tiny and delicate — like a dense micro-print or Liberty-style print"
```

Gemini는 추상적 수치보다 **시각적 레퍼런스 + 서술적 묘사**를 훨씬 잘 따른다.

### 패턴 스케일 표현 가이드

| 스케일    | 묘사 방식                                                                     | 실물 레퍼런스                   |
| --------- | ----------------------------------------------------------------------------- | ------------------------------- |
| 큰 패턴   | "bold and prominent, only 5 motifs fit across the width, open and spacious"   | 대형 볼드 프린트                |
| 보통 패턴 | "small but clearly distinguishable, about 10 per row, balanced"               | 클래식 실크 포울라드(foulard)   |
| 작은 패턴 | "tiny and delicate, reads as fine texture from distance, about 13-14 per row" | Liberty 프린트, 마이크로 프린트 |

### 금기 사항

- `CRITICAL —`, `MUST`, 과도한 대문자 → **키워드 스터핑으로 효과 감소**
- 모순된 크기 지시 혼용 (예: PATTERN_MAP의 `%` 수치 + buildScalePrompt의 개수 동시 사용)

---

## 이미지 편집 기능 (Gemini 2.5 Flash Image)

Gemini 2.5 Flash Image는 텍스트→이미지 생성뿐 아니라 **기존 이미지를 정밀하게 수정**하는 기능을 지원한다.

### 지원 편집 유형

| 편집 유형                | 설명                                              | 예시                               |
| ------------------------ | ------------------------------------------------- | ---------------------------------- |
| **마스크 없는 인페인팅** | 특정 요소만 변경, 나머지 유지                     | "셔츠의 얼룩만 제거해줘"           |
| **요소 추가/제거**       | 이미지에서 객체 삽입 또는 삭제                    | "배경에서 사람을 지워줘"           |
| **스타일 변경**          | 전체 또는 부분 스타일 전환                        | "이 사진을 수채화 스타일로"        |
| **색상 조정**            | 색상 그레이딩, 특정 부위 색상 변경                | "흑백 사진에 색상 입혀줘"          |
| **포즈/구도 수정**       | 피사체의 자세나 구도 변경                         | "인물의 포즈를 바꿔줘"             |
| **아웃페인팅**           | 이미지 경계 밖으로 확장 생성                      | "이미지를 왼쪽으로 확장해줘"       |
| **멀티 이미지 합성**     | 여러 이미지를 합쳐 새 이미지 생성                 | "이 오브젝트를 저 장면에 배치해줘" |
| **캐릭터 일관성 유지**   | 동일 캐릭터/오브젝트 외형을 여러 편집에 걸쳐 유지 | 브랜드 캐릭터 시리즈 제작          |

### API 사용법 — 이미지 편집

기존 이미지를 `inlineData`로 함께 전달하면 편집 모드로 동작한다.

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        { "text": "넥타이 패턴의 색상을 네이비로 바꿔줘" },
        {
          "inlineData": {
            "mimeType": "image/png",
            "data": "<base64 인코딩된 기존 이미지>"
          }
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["IMAGE"]
  }
}
```

### 멀티턴 편집 (대화형 반복 수정)

같은 `contents` 배열에 이전 이미지와 응답을 누적하면 이전 편집 결과를 기반으로 추가 수정이 가능하다.

```json
{
  "contents": [
    { "role": "user", "parts": [{ "text": "상어 패턴 넥타이 만들어줘" }] },
    {
      "role": "model",
      "parts": [{ "inlineData": { "mimeType": "image/png", "data": "..." } }]
    },
    {
      "role": "user",
      "parts": [{ "text": "상어 색상만 네이비로 바꿔줘, 나머지는 그대로" }]
    }
  ]
}
```

### 편집 프롬프트 작성 팁

- **유지할 것을 명시**: "나머지는 그대로 유지하고 ~만 변경해줘"
- **통합 방식 설명**: 단순 변경 나열보다 "기존 조명·스타일과 자연스럽게 어우러지도록" 설명
- **입력 이미지 비율 주의**: 편집 시 모델은 입력 이미지의 비율을 유지하려 함. 여러 이미지 입력 시 마지막 이미지 비율을 따름

### 프로젝트 활용 가능성

현재 프로젝트는 매번 이미지를 새로 생성하는 방식. 이전에 생성된 이미지를 `referenceImageBase64`로 함께 전달하면:

- "색상만 바꿔줘" → 전체 재생성 없이 색상만 수정
- "패턴 크기 키워줘" → 기존 디자인 유지하며 스케일만 조정
- 생성 시간 단축 및 일관성 향상 기대

---

## 2025–2026 신기능

| 기능                                   | 출시 시기   | 설명                                                               |
| -------------------------------------- | ----------- | ------------------------------------------------------------------ |
| Gemini 2.5 Flash Image GA              | 2025년 8월  | 새 aspect ratio 지원, 프로덕션 준비 완료                           |
| Gemini 2.5 Segmentation                | 2025년      | bounding box → 마스크 수준 위치 정밀도 향상                        |
| Gemini 3.0 Flash Agentic Vision        | 2025년 말   | Think-Act-Observe 루프로 Python 코드 실행, pixel-level 이미지 조작 |
| 3D Spatial Understanding               | 2025년 11월 | 3D 장면 이해 및 공간 추론 강화                                     |
| Gemini 3.1 Flash Image (Nano Banana 2) | 2026년 초   | 현 시점 최신 모델                                                  |

### Bounding Box 좌표 시스템 (이미지 분석 방향)

Gemini 2.5+에서 이미지 **분석** 시 객체 위치를 0–1000 정규화 좌표로 반환한다. 생성 프롬프트 입력으로는 미지원이지만, 분석→생성 파이프라인에 활용 가능하다.

```json
{
  "box_2d": [y_min, x_min, y_max, x_max],
  "label": "object_name"
}
```

픽셀 역변환: `x_pixel = (x / 1000) * image_width`

---

## 이미지 설정 옵션 (API)

```json
{
  "generationConfig": {
    "responseModalities": ["IMAGE"],
    "imageConfig": {
      "aspectRatio": "9:16"
    }
  }
}
```

지원 비율: `1:1`, `3:4`, `4:3`, `9:16`, `16:9`, `1:4`, `4:1`, `1:8`, `8:1`
해상도: `512px`, `1K`, `2K`, `4K` (모델에 따라 다름)
모든 생성 이미지에는 **SynthID 워터마크** 포함됨

---

## 프로젝트 적용 사항

현재 `supabase/functions/generate-design/prompts.ts`에서:

- `buildScalePrompt()` — 대화 히스토리까지 체크해 스케일 유지, 서술형 묘사 사용
- `PATTERN_MAP` — 크기 수치 제거, 패턴 종류만 명시 (크기는 buildScalePrompt가 담당)
- `buildBasePrompt()` — 균일한 반복 패턴 명시
- `buildCiPlacementPrompt()` — one-point 위치는 수치 좌표 대신 방향 서술어 사용

---

## 참고 링크

- [Gemini 이미지 생성 API 공식 문서 (한국어)](https://ai.google.dev/gemini-api/docs/image-generation?hl=ko)
- [Gemini 2.5 Flash 이미지 생성 프롬프트 가이드 — Google Developers Blog](https://developers.googleblog.com/en/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/)
- [Gemini 2.5 Flash Image GA 발표 — Google Developers Blog](https://developers.googleblog.com/en/gemini-2-5-flash-image-now-ready-for-production-with-new-aspect-ratios/)
- [Nano Banana 프롬프트 작성법 — Google DeepMind](https://deepmind.google/models/gemini-image/prompt-guide/)
- [Nano Banana 2 (Gemini 3.1 Flash Image) — Google DeepMind](https://deepmind.google/models/gemini-image/flash/)
- [Imagen 이미지 생성 — Google AI for Developers](https://ai.google.dev/gemini-api/docs/imagen)
- [Gemini 2.5 Flash Image 가이드 — DataCamp](https://www.datacamp.com/tutorial/gemini-2-5-flash-image-guide)
- [Gemini 2.5 Flash Image 출시 발표 — Google Developers Blog](https://developers.googleblog.com/introducing-gemini-2-5-flash-image/)
- [Vertex AI 이미지 편집(인페인팅) — Google Cloud Docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/edit-remove-objects)
- [Bounding Box 탐지 — Vertex AI Google Cloud](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/bounding-box-detection)
- [Vertex AI 이미지 프롬프트 가이드 — Google Cloud](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/img-gen-prompt-guide)
- [Gemini 3.0 Flash Agentic Vision — 9to5Google](https://9to5google.com/2026/01/27/gemini-3-flash-agentic-vision/)
