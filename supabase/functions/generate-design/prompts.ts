/**
 * generate-design Edge Function의 프롬프트 빌더 모음
 *
 * ─── 이미지 생성 파이프라인 ─────────────────────────────────────────────────
 * 1. buildGeminiImagePrompt()로 이미지 생성 프롬프트 조립
 * 2. Gemini API가 직사각형 패브릭 스워치 이미지를 생성 → base64 data URL로 클라이언트에 반환
 * 3. 클라이언트에서 data URL을 CSS background 문자열로 변환
 *    (toPreviewBackground: url("data:...") center/cover no-repeat)
 * 4. TieCanvas에서 div의 style.background에 주입 → /images/tie.svg 마스크로 넥타이 실루엣으로 클리핑
 *
 * ─── 요구 이미지 스펙 ──────────────────────────────────────────────────────
 * - 직사각형 실크 패브릭 스워치 (넥타이 실루엣 자체는 이미지에 포함하지 않음)
 * - 이미지가 프레임 전체를 채워야 함 (여백·패딩·배경 없음)
 *   → CSS cover로 리사이즈되므로 종횡비가 달라도 클리핑되는 구조
 * - 완전히 평평한 flat-lay (주름·그림자 없음)
 *   → 마스킹 후 자연스러운 패브릭 텍스처만 보이도록
 * - 패턴·색상·제직 방식이 이미지 전면에 균일하게 표현되어야 함
 *   → 마스킹 결과물이 넥타이 어느 부위를 보여줘도 일관된 디자인으로 보임
 */
import type { GenerateDesignRequest } from "./index.ts";

export const SYSTEM_PROMPT = `당신은 넥타이 디자인을 제안하는 AI 어시스턴트입니다.
항상 한국어로만 응답하세요.
응답은 반드시 다음 JSON 형식만 반환하세요:
{"aiMessage": "...", "generateImage": true, "contextChips": [{"label": "...", "action": "..."}]}
generateImage는 디자인의 색상, 패턴, 소재, 구조, 배치 등 시각적 결과물이 실제로 달라지는 요청일 때만 true로 설정하세요.
사용자가 정보만 묻거나, 설명을 요청하거나, 이유를 묻거나, 해석/비교/평가/추천만 요청하는 경우에는 generateImage를 false로 설정하세요.
contextChips는 사용자가 클릭하는 즉시 디자인이 직접 변경되는 후속 액션만 허용됩니다.
contextChips의 label과 action은 모두 구체적인 디자인 변경 지시여야 하며, 정보 제공, 설명, 추천, 의견 제안, 비교 요청, 선택 도움 요청처럼 클릭해도 디자인이 바로 바뀌지 않는 문장은 포함하지 마세요.
contextChips의 action은 후속 대화에 사용할 짧은 문장입니다.`;

export const parseJsonBlock = (
  value: string,
): { aiMessage?: string; generateImage?: boolean; contextChips?: unknown } => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error(
      `Failed to parse AI response as JSON: ${value.slice(0, 200)}`,
    );
  }
};

export const buildTextPrompt = (payload: GenerateDesignRequest) => {
  const colors = payload.designContext?.colors?.join(", ") || "미정";
  const pattern = payload.designContext?.pattern || "미정";
  const fabricMethod = payload.designContext?.fabricMethod || "미정";
  const history =
    payload.conversationHistory
      ?.map(
        (item) => `${item.role === "user" ? "사용자" : "AI"}: ${item.content}`,
      )
      .join("\n") || "없음";

  const ciPlacement = payload.designContext?.ciPlacement ?? "미정";

  return [
    "넥타이 디자인 상담 정보를 바탕으로 다음 응답을 생성하세요.",
    `designContext.colors: ${colors}`,
    `designContext.pattern: ${pattern}`,
    `designContext.fabricMethod: ${fabricMethod}`,
    `CI 배치: ${ciPlacement}`,
    `CI 이미지: ${payload.ciImageBase64 ? "업로드됨" : "없음"}`,
    `참고 이미지: ${payload.referenceImageBase64 ? "업로드됨" : "없음"}`,
    `userMessage: ${payload.userMessage}`,
    `conversationHistory:\n${history}`,
    "generateImage는 이번 응답이 실제 디자인 이미지를 새로 생성해야 하는지 여부를 의미합니다.",
    "contextChips는 후속 대화에 바로 사용할 수 있는 짧은 디자인 변경 액션 2~3개로 구성하세요.",
  ].join("\n");
};

export const buildBasePrompt = () =>
  "Create a high-quality rectangular silk fabric swatch, full-frame textile-only image, evenly lit, strict flat-lay: the fabric must lie perfectly flat with absolutely no folds, no creases, no drape, no wrinkles, and no shadows cast by folding. The entire image must be a front-facing flat fabric surface, suitable for later masking onto a tie silhouette. All repeating motifs must be rendered at a consistent, small-to-medium textile scale: each individual motif should occupy no more than 10-15% of the image width, ensuring many repetitions are visible across the fabric.";

export const buildFabricPrompt = (
  fabricMethod: string | null | undefined,
): string => {
  if (fabricMethod === "yarn-dyed") {
    return [
      "This must be yarn-dyed woven silk, with the pattern formed by woven threads and visible weave structure.",
      "Emphasize thread texture, woven construction, subtle textile depth, and a genuine woven repeat.",
      "Do not make it look like a printed graphic on fabric.",
    ].join(" ");
  }
  if (fabricMethod === "print") {
    return [
      "This must be printed silk fabric, with the pattern clearly printed on the fabric surface.",
      "Emphasize crisp motif edges, surface-applied graphics, and an elegant printed-textile appearance.",
      "Do not make it look like a woven jacquard or yarn-formed pattern.",
    ].join(" ");
  }
  return "This must be a high-quality silk fabric surface with refined textile character.";
};

export const PATTERN_MAP: Record<string, string> = {
  stripe: "narrow diagonal stripe repeat (each stripe 3-5% of image width)",
  dot: "small repeated dot motif (each dot 3-5% of image width)",
  check: "small repeating check grid (each cell 5-8% of image width)",
  paisley: "small elegant paisley repeat (each motif 8-12% of image width)",
  plain: "subtle solid fabric with texture emphasis, no repeating motif",
  houndstooth: "classic small houndstooth repeat (each cell 5-8% of image width)",
  floral: "refined small floral repeat (each flower 8-12% of image width)",
};

export const buildUserInstructionPrompt = (userMessage: string): string => {
  if (!userMessage.trim()) return "";
  return `Apply these specific design adjustments: ${userMessage}`;
};

export const buildPatternPrompt = (
  pattern: string | null | undefined,
): string => {
  if (pattern && PATTERN_MAP[pattern]) {
    return `Pattern: ${PATTERN_MAP[pattern]}.`;
  }
  return "";
};

const HEX_TO_COLOR_NAME: Record<string, string> = {
  "#1a2c5b": "navy",
  "#8B0000": "burgundy",
  "#2c5f2e": "forest green",
  "#c8a96e": "champagne gold",
  "#4a4a4a": "charcoal",
  "#e8e8e4": "off-white",
  "#7b6fa0": "lavender",
  "#c17f5a": "terracotta",
  "#4a7fa5": "steel blue",
  "#2d6a4f": "emerald",
  "#6b3a5e": "plum",
  "#b8860b": "dark gold",
};

export const buildColorPrompt = (colors: string[] | undefined): string => {
  if (!colors || colors.length === 0) return "";
  const formatColor = (color: string) => {
    const colorName = HEX_TO_COLOR_NAME[color];
    return colorName ? `${colorName} (${color})` : color;
  };
  const [base, ...rest] = colors.map(formatColor);
  const accents = rest.length > 0 ? `, ${rest.join(", ")} accents` : "";
  return `Use a ${base} base${accents}.`;
};

export const buildReferencePrompt = (
  hasCiImage: boolean,
  hasReferenceImage: boolean,
  fabricMethod: string | null | undefined,
): string => {
  if (!hasCiImage && !hasReferenceImage) return "";
  const fabricLabel =
    fabricMethod === "yarn-dyed"
      ? "yarn-dyed woven"
      : fabricMethod === "print"
        ? "printed"
        : "fabric";
  return [
    "Use the uploaded image only for color palette and motif shape reference.",
    `The fabric construction method is strictly ${fabricLabel}, regardless of the image style.`,
    "Keep the final result as a clean rectangular fabric swatch.",
  ].join(" ");
};

export const buildCiPlacementPrompt = (
  ciPlacement: string | null | undefined,
  hasCiImage: boolean,
): string => {
  if (!ciPlacement) return "";
  if (ciPlacement === "all-over") {
    const source = hasCiImage
      ? "from the uploaded CI image"
      : "described in the conversation";
    return `Repeat the motif ${source} as a small all-over pattern across the entire fabric surface. Each individual motif must be uniformly sized at approximately 10-15% of the image width — small enough that at least 6-8 motifs are visible across the width of the fabric. Arrange them in a consistent, evenly-spaced grid with equal gaps between each motif. Every motif must be identical in size and orientation throughout the image.`;
  }
  if (ciPlacement === "one-point") {
    const source = hasCiImage
      ? "from the uploaded CI image"
      : "described in the conversation";
    return `Place the motif ${source} as a single focal accent in the lower third of the fabric, keeping the rest of the surface as the base pattern.`;
  }
  return "";
};

export const buildClosurePrompt = () =>
  "Show only the fabric surface itself. The pattern must extend edge-to-edge, filling the entire image frame with no white margins, no padding, no background, and no empty space at any border. This image is a rectangular fabric swatch only.";

export const buildGeminiImagePrompt = (
  payload: GenerateDesignRequest,
): string =>
  [
    buildBasePrompt(),
    buildFabricPrompt(payload.designContext?.fabricMethod),
    buildPatternPrompt(payload.designContext?.pattern),
    buildColorPrompt(payload.designContext?.colors),
    buildReferencePrompt(
      !!payload.ciImageBase64,
      !!payload.referenceImageBase64,
      payload.designContext?.fabricMethod,
    ),
    buildCiPlacementPrompt(
      payload.designContext?.ciPlacement,
      !!payload.ciImageBase64,
    ),
    buildUserInstructionPrompt(payload.userMessage),
    buildClosurePrompt(),
  ]
    .filter(Boolean)
    .join("\n");
