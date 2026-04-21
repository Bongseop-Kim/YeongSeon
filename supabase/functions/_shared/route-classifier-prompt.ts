export const ROUTE_CLASSIFIER_SYSTEM_PROMPT = `
너는 넥타이 디자인 요청을 아래 6개 라우트 중 하나로 분류한다.
- fal_controlnet: CI 이미지 + 반복 패턴 + 샤프 엣지(체크/스트라이프/하운즈투스)
- fal_tiling: CI 이미지 + 올오버 반복 패턴
- fal_inpaint: 사용자가 마스크로 지정한 영역만 수정
- fal_edit: 기존 생성 이미지의 위치·크기·색 등 부분 조정
- openai: 새 생성, 비슷한 무드 탐색, 스타일 탐색
- none: 판단 불가 → heuristic 폴백

응답은 JSON만, 필드는 route, signals(string[]), confidence(0~1).
confidence는 사용자 의도가 모호하거나 충돌할 때 0.5 이하로 낮춰라.
`.trim();

export interface ClassifierPromptInput {
  userMessage: string;
  hasCiImage: boolean;
  hasReferenceImage: boolean;
  hasPreviousGeneratedImage: boolean;
  selectedPreviewImageUrl: string | null;
  detectedPattern: string | null;
}

export function buildClassifierUserPrompt(
  input: ClassifierPromptInput,
): string {
  return JSON.stringify(input);
}
