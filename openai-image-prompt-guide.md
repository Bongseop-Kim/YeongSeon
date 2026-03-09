# OpenAI 이미지 생성 프롬프트 가이드

> 조사일: 2026-03-08
> 권장 모델: `gpt-image-1.5`
> 기준 문서: OpenAI API Docs / OpenAI Cookbook

---

## 핵심 결론

- **현재 OpenAI 이미지 생성 기본 추천 모델은 `gpt-image-1.5`** 이다.
- **한 번에 한 장 생성/편집**이면 `Image API`가 가장 단순하다.
- **대화형 반복 수정, 멀티턴 편집, 이전 결과 이어받기**가 필요하면 `Responses API`가 더 적합하다.
- OpenAI는 키워드 나열보다 **장면 + 대상 + 세부 묘사 + 제약조건**이 분명한 프롬프트를 더 안정적으로 따른다.
- 편집에서는 `"이것만 바꾸고 나머지는 유지"` 식으로 **변경 대상과 유지 대상을 동시에 명시**해야 드리프트가 줄어든다.

---

## 어떤 API를 쓸지

| 상황 | 권장 API | 이유 |
|---|---|---|
| 텍스트 한 번 넣고 이미지 1장 생성 | `Image API` | 가장 단순함 |
| 기존 이미지를 받아 편집 | `Image API` 또는 `Responses API` | 단발 편집은 Image API로 충분 |
| "이전 결과에서 색만 바꿔줘" 같은 대화형 수정 | `Responses API` | 멀티턴 컨텍스트 유지 가능 |
| 디버깅하면서 모델이 실제로 어떤 프롬프트로 재작성했는지 확인 | `Responses API` | `revised_prompt` 확인 가능 |

OpenAI 공식 문서도 다음처럼 구분한다:

- 단일 생성/편집은 `Image API`
- 대화형·반복형 이미지 경험은 `Responses API`

---

## 모델 선택

| 모델 | 추천도 | 용도 |
|---|---|---|
| `gpt-image-1.5` | 가장 추천 | 품질, 지시 이행, 편집 제어 모두 최고 |
| `gpt-image-1` | 가능 | 이전 세대 GPT Image |
| `gpt-image-1-mini` | 비용 우선일 때 | 저렴하지만 품질 우선 작업엔 불리 |

### 참고

- `gpt-image-1.5`가 최신 주력 모델이다.
- `DALL·E 2`, `DALL·E 3`는 **Deprecated** (지원 종료일: 2026-05-12). 신규 구현에는 사용하지 말 것. GPT Image 계열(`gpt-image-1.5` 등)을 사용할 것.
- GPT Image 사용 전에는 OpenAI 문서 기준 **API Organization Verification** 이 필요할 수 있다.

---

## 효과적인 프롬프트 구조

OpenAI Cookbook 기준 핵심 구조:

```text
[배경/장면] + [주제/대상] + [핵심 디테일] + [구도/조명/스타일] + [제약조건]
```

가장 안정적인 방식은 아래 순서다.

```text
1. 무엇을 만들지
2. 어떤 맥락/용도인지
3. 어떻게 보여야 하는지
4. 무엇은 절대 바꾸면 안 되는지
```

### 좋은 예시

```text
Create a premium rectangular silk fabric swatch for a necktie product preview.
The fabric fills the entire frame with no background or margins.
Use a refined navy base with a dense micro floral repeat.
The cloth is perfectly flat, front-lit, and evenly exposed.
Keep the motif uniform across the whole surface.
No folds, no shadows, no empty border, no watermark, no extra text.
```

### 나쁜 예시

```text
navy floral silk tie fabric luxury premium realistic 8k detailed pattern
```

핵심은:

- **키워드 뭉치보다 완성된 지시문**
- **스타일보다 제약조건**
- **"좋게 만들어줘"보다 구체적인 시각 조건**

---

## 프롬프트 작성 원칙

### 1. 용도를 먼저 적기

단순한 그림인지, 광고용인지, 제품 상세용인지, UI 목업인지 먼저 적는 편이 좋다.

```text
Create a product-ready fabric swatch for ecommerce preview.
```

### 2. 재질·형태·질감을 구체적으로 쓰기

OpenAI Cookbook은 재질, 형태, 질감, 시각 매체를 구체적으로 적으라고 권장한다.

```text
smooth printed silk surface, crisp edges, subtle sheen
```

### 3. 구도는 자연어로 명시하기

위치 제어는 숫자 좌표보다 자연어 구도가 낫다.

```text
subject centered
logo in the top-right
empty space on the left
slightly right of center in the lower portion
```

### 4. 바꿀 것과 유지할 것을 동시에 적기

편집에서는 이 원칙이 가장 중요하다.

```text
Change only the logo color to silver.
Keep the fabric pattern, scale, composition, lighting, and all other details exactly the same.
```

### 5. 한 번에 너무 많은 요구를 몰아넣지 말기

OpenAI Cookbook은 복잡한 요구를 한 번에 몰기보다 **작은 수정 단위로 반복 편집**하라고 권장한다.

```text
1차: 패턴 생성
2차: 색상 수정
3차: CI 위치 수정
4차: 밀도 수정
```

---

## 유형별 프롬프트 팁

### 사실적 사진풍

- 카메라 시점
- 조명
- 질감
- 과한 스튜디오 보정 금지

```text
Create a candid, photorealistic fabric product shot.
Soft frontal lighting, natural silk sheen, realistic weave detail, no dramatic grading.
```

OpenAI Cookbook은 사실감을 원하면 `8K`, `ultra-detailed` 같은 모호한 표현보다
**렌즈, 프레이밍, 조명, 실제 표면 질감**을 쓰는 편이 더 잘 먹힌다고 설명한다.

### 로고/심볼 생성

- 브랜드 성격
- 단순성
- 확장성
- 금지 요소

```text
Create an original, non-infringing logo for a premium tie brand.
Warm, understated, elegant.
Use clean vector-like shapes, balanced negative space, and a strong silhouette.
Flat design, minimal detail, plain background, no watermark.
```

### 이미지 안의 텍스트

텍스트 렌더링은 개선됐지만 여전히 불안정할 수 있다. 정확도가 중요하면:

- 텍스트를 따옴표로 감싼다
- `EXACT`, `verbatim` 같은 제약을 준다
- 글꼴/배치/색을 함께 쓴다

```text
Include ONLY this text, verbatim: "YEONGSEON"
Typography: bold serif, centered, high contrast, generous letter spacing.
No extra text.
```

### 기존 이미지 편집

가장 중요한 패턴:

```text
Edit the image.
Change only X.
Keep Y, Z, A exactly the same.
```

예:

```text
Edit the fabric image.
Change only the motif color from gold to silver.
Keep the pattern scale, placement, silk texture, framing, and lighting exactly the same.
Do not add any new elements.
```

### 멀티 이미지 합성

OpenAI는 여러 입력 이미지를 받을 수 있다. 이때는 각 이미지를 **번호 기반으로 역할 지정**하는 편이 좋다.

```text
Image 1: base tie fabric.
Image 2: CI logo reference.
Apply the visual shape of Image 2 onto Image 1 as a subtle one-point accent.
Keep the base fabric from Image 1 unchanged.
```

---

## Responses API에서 중요한 개념

### `action`

`Responses API`의 이미지 생성 도구에서는 `action`을 쓸 수 있다.

| 값 | 의미 |
|---|---|
| `auto` | 생성/편집을 모델이 판단, 공식 권장 |
| `generate` | 항상 새 이미지 생성 |
| `edit` | 반드시 편집 수행, 입력 이미지가 없으면 에러 |

실무적으로는:

- 새 이미지 시작: `generate`
- 대화형 UI: `auto`
- 이미 입력 이미지가 확실히 있는 편집 단계: `edit`

### `revised_prompt`

`Responses API`에서는 메인라인 모델이 프롬프트를 내부적으로 다듬을 수 있고,
그 결과를 `revised_prompt`로 확인할 수 있다.

이건 매우 유용하다.

- 왜 결과가 예상과 달랐는지 추적 가능
- 모델이 어떤 정보를 강조했는지 확인 가능
- 반복 개선 시 로그로 남기기 좋음

---

## 편집 품질을 높이는 기능

### `input_fidelity`

OpenAI GPT Image 계열은 **입력 이미지 보존 강도**를 높일 수 있다.

```text
input_fidelity: "high"
```

특히 유용한 경우:

- 얼굴
- 로고
- 브랜드 심볼
- 제품 라벨
- 기존 도안의 형태 유지

공식 문서 기준:

- `gpt-image-1`, `gpt-image-1-mini`는 **첫 번째 입력 이미지**가 더 잘 보존된다
- `gpt-image-1.5`는 **처음 5개 입력 이미지**가 더 높은 fidelity로 보존된다

즉, 현재 프로젝트처럼

- 기준 패브릭 이미지
- CI 로고 이미지
- 참고 이미지

를 함께 넣을 때 `gpt-image-1.5`가 더 유리하다.

### 마스크 편집

마스크 기반 편집도 가능하다. 최신 문서 기준 요구사항:

- **정사각형 PNG**
- **4MB 미만**
- **alpha channel 포함**

주의:

- GPT Image의 마스킹은 DALL·E 2처럼 기계적으로 딱 잘라 바꾸는 방식이라기보다
  **프롬프트 유도형 편집**에 가깝다
- 여러 이미지를 넣으면 **마스크는 첫 번째 이미지에 적용**된다

즉, 위치 정밀도가 매우 중요한 작업은 마스크만 믿기보다
프롬프트에도 유지/변경 범위를 같이 써야 한다.

---

## 출력 옵션

OpenAI 공식 문서 기준 GPT Image 출력 옵션:

| 항목 | 값 |
|---|---|
| `size` | `1024x1024`, `1536x1024`, `1024x1536`, `auto` |
| `quality` | `low`, `medium`, `high`, `auto` |
| `background` | `opaque`, `transparent`, `auto` |
| `output_format` | `png`, `jpeg`, `webp` |
| `output_compression` | `jpeg`, `webp`에서 0~100 |

### 실무 추천

| 용도 | 추천 설정 |
|---|---|
| 빠른 초안 | `quality: "low"` |
| 일반 프로덕션 | `quality: "medium"` |
| 텍스트 많은 이미지 / 정교한 결과 | `quality: "high"` |
| 투명 배경 에셋 | `background: "transparent"`, `png` 또는 `webp` |
| 속도 우선 | `jpeg` |

### 투명 배경

OpenAI는 투명 배경을 공식 지원한다.

```text
background: "transparent"
```

주의:

- `png`, `webp`에서만 지원
- 공식 문서상 `medium` 또는 `high` 품질에서 더 잘 동작

---

## 한계 사항

OpenAI 공식 문서가 명시한 대표 제한:

- 복잡한 프롬프트는 **최대 2분 정도** 걸릴 수 있다
- 텍스트 렌더링은 좋아졌지만 **정확한 배치와 선명도는 아직 실패 가능성**이 있다
- 반복 생성 간 캐릭터/브랜드 요소의 **완전한 일관성은 보장되지 않는다**

즉:

- 브랜드 로고 정확도는 `input_fidelity` + 편집 방식으로 보완
- 텍스트는 짧고 명확하게
- 대형 문구가 많은 디자인은 `quality: "high"` 우선

---

## 현재 프로젝트에 적용하면 좋은 방식

현재 프로젝트 구조를 OpenAI 기준으로 옮기면 아래 전략이 맞다.

### 1. 기본 모델

`gpt-image-1.5` 사용 권장.

이유:

- CI/참고 이미지 보존력이 더 좋음
- 편집 워크플로우에 유리함
- 프롬프트 이행력이 가장 좋음

### 2. API 선택

- 지금처럼 요청 1회마다 결과만 받는 구조면 `Image API`
- "이전 결과에서 조금만 수정" UX를 강화하려면 `Responses API`

### 3. 현재 프롬프트 함수 매핑

| 현재 개념 | OpenAI식 작성 포인트 |
|---|---|
| `buildBasePrompt()` | 프레임 전체를 채우는 스워치, 배경 없음, 그림자 없음, 균일 반복 명시 |
| `buildScalePrompt()` | 숫자 개수보다 `dense micro-print`, `bold oversized repeat` 같은 시각 서술 우선 |
| `buildCiPlacementPrompt()` | `slightly right of center`, `lower portion`, `small accent`처럼 자연어 위치 지정 |
| `buildReferencePrompt()` | `Image 1`, `Image 2` 역할 분리 + `input_fidelity: "high"` 결합 |

### 4. CI/참고 이미지가 있을 때

가장 안정적인 패턴:

```text
Image 1: base fabric reference.
Image 2: CI logo reference.
Preserve the fabric appearance from Image 1.
Use the visual silhouette of Image 2 as a small one-point accent.
Do not reproduce any extra text beyond the logo shape itself.
Keep everything else unchanged.
```

여기서 실제 API 파라미터는:

```json
{
  "model": "gpt-image-1.5",
  "input_fidelity": "high",
  "quality": "high"
}
```

### 5. 반복 수정 UX

Gemini처럼 매번 처음부터 새로 생성하기보다 OpenAI `Responses API`로:

1. 첫 생성
2. 이전 응답 ID 또는 이전 생성 이미지 ID 유지
3. `"색상만 바꿔줘"`, `"CI만 조금 아래로"` 같은 follow-up edit

방식이 더 잘 맞는다.

이 흐름이면 드리프트가 줄고 프롬프트도 짧아진다.

---

## 바로 쓸 수 있는 프롬프트 템플릿

### 넥타이 패브릭 생성

```text
Create a premium rectangular silk fabric swatch for a necktie preview.
The fabric must fill the entire frame edge to edge.
No background, no margins, no tie silhouette.

Design:
- [pattern description]
- [color palette]
- [fabric method: printed silk / yarn-dyed woven silk]

Look:
- perfectly flat lay
- even frontal lighting
- refined silk texture
- uniform repeat across the full surface

Constraints:
- no folds
- no wrinkles
- no shadows
- no watermark
- no extra text
```

### one-point CI 배치

```text
Place a single small CI accent slightly right of center and in the lower portion of the fabric.
It should feel subtle and refined, not like the main subject.
Keep the base pattern unchanged.
```

### 기존 이미지에서 색만 수정

```text
Edit the image.
Change only the base color from navy to burgundy.
Keep the motif, scale, spacing, composition, fabric texture, and lighting exactly the same.
Do not add or remove any elements.
```

### 텍스트 포함 이미지

```text
Create a clean campaign visual.
Include ONLY this text, verbatim: "YEONGSEON"
Typography: elegant serif, centered, high contrast, perfectly legible.
No extra characters, no watermark, no additional text.
```

---

## 참고 링크

- [OpenAI Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [OpenAI GPT Image 1.5 model page](https://developers.openai.com/api/docs/models/gpt-image-1.5)
- [OpenAI GPT Image 1 model page](https://developers.openai.com/api/docs/models/gpt-image-1)
- [OpenAI Cookbook: GPT Image 1.5 Prompting Guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide)
