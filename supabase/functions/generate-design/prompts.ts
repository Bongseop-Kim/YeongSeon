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

export const SYSTEM_PROMPT =
  `당신은 넥타이 디자인을 제안하는 AI 어시스턴트입니다.
항상 한국어로만 응답하세요.
응답은 반드시 다음 JSON 형식만 반환하세요:
{"aiMessage": "...", "generateImage": true, "contextChips": [{"label": "...", "action": "..."}], "detectedDesign": {"pattern": null, "colors": [], "ciPlacement": null, "scale": null}}

generateImage 판단 기준:
- true: 사용자가 특정 패턴·모티프·색상·스타일을 언급하거나 디자인 변경을 요청한 경우. "상어 패턴", "스트라이프로", "파란색으로 바꿔줘" 등 시각적 결과물이 달라지는 모든 요청은 true.
- false: 순수하게 정보만 묻거나("선염이 뭐야?"), 비교·평가·추천만 요청하는 경우("어떤 색이 더 나을까?").
- 불확실하면 true로 설정하세요. 디자인 요청을 이미지 없이 처리하는 것보다 이미지를 생성하는 쪽이 낫습니다.

generateImage를 false로 설정하는 경우, aiMessage에는 반드시:
1. 왜 이미지를 생성하지 못했는지 (또는 어떤 정보가 부족한지) 명확히 설명
2. 디자인을 구체화하기 위해 어떤 정보를 추가로 알려주면 좋을지 제안
예시: "어떤 스타일의 상어 패턴을 원하시는지 알 수 없어서 이미지를 생성하지 못했습니다. 귀여운 캐릭터풍인지, 사실적인 일러스트풍인지, 실루엣 스타일인지 알려주시면 바로 만들어드릴 수 있어요."

detectedDesign은 사용자 메시지와 대화 전체에서 감지한 디자인 속성입니다. generateImage가 true일 때 반드시 채워주세요.
- pattern: 감지된 패턴. stripe / dot / check / paisley / plain / houndstooth / floral 중 하나. 언급 없으면 null.
- colors: 감지된 색상 목록. 영어 색상명 배열 (예: ["navy", "burgundy"]). 언급 없으면 [].
- ciPlacement: 감지된 CI 배치. "all-over" 또는 "one-point". 언급 없으면 null.
- scale: "large" | "medium" | "small" | null. 패턴 크기 변경 요청이면 감지. 언급 없으면 null.
이미 designContext에 설정된 값이 있으면 그 값을 우선하고, 사용자 메시지에서 새로 언급된 것만 반영하세요.

contextChips는 사용자가 클릭하는 즉시 디자인이 직접 변경되는 후속 액션만 허용됩니다.
contextChips의 label과 action은 모두 구체적인 디자인 변경 지시여야 하며, 정보 제공, 설명, 추천, 의견 제안, 비교 요청, 선택 도움 요청처럼 클릭해도 디자인이 바로 바뀌지 않는 문장은 포함하지 마세요.
contextChips의 action은 후속 대화에 사용할 짧은 문장입니다.`;

export const parseJsonBlock = (
  value: string,
): {
  aiMessage?: string;
  generateImage?: boolean;
  contextChips?: unknown;
  detectedDesign?: unknown;
} => {
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
  const ciPlacement = payload.designContext?.ciPlacement ?? "미정";

  return [
    "현재 넥타이 디자인 상태를 바탕으로 사용자 메시지에 응답하세요.",
    `designContext.colors: ${colors}`,
    `designContext.pattern: ${pattern}`,
    `designContext.fabricMethod: ${fabricMethod}`,
    `CI 배치: ${ciPlacement}`,
    `CI 이미지: ${payload.ciImageBase64 ? "업로드됨" : "없음"}`,
    `참고 이미지: ${payload.referenceImageBase64 ? "업로드됨" : "없음"}`,
    `userMessage: ${payload.userMessage}`,
    "generateImage는 이번 응답이 실제 디자인 이미지를 새로 생성해야 하는지 여부를 의미합니다.",
    "contextChips는 후속 대화에 바로 사용할 수 있는 짧은 디자인 변경 액션 2~3개로 구성하세요.",
  ].join("\n");
};

export const buildBasePrompt = () =>
  "Create a high-quality rectangular silk fabric swatch. The image must be full-frame and textile-only — no tie silhouette, no background, no margins. The fabric lies perfectly flat with absolutely no folds, creases, drape, wrinkles, or shadows. Evenly lit from the front. The repeating motif must be uniform in size and spacing across the entire surface.";

export const buildFabricPrompt = (
  fabricMethod: string | null | undefined,
): string => {
  if (fabricMethod === "yarn-dyed") {
    return [
      "Fabric construction: yarn-dyed woven silk.",
      "The pattern is formed entirely by interwoven threads — visible weave structure, subtle textile depth, and a genuine woven repeat.",
      "Each motif appears as a single solid thread color against the background, rendered as a clean silhouette.",
      "The pattern emerges from the thread interlacing itself, not from printing.",
      "The surface has the tactile, slightly textured quality of woven jacquard silk.",
    ].join(" ");
  }
  if (fabricMethod === "print") {
    return [
      "Fabric construction: printed silk.",
      "The pattern is screen-printed or digitally printed directly onto the fabric surface — crisp edges, vibrant colors, and surface-applied graphics.",
      "Multi-color details within each motif are fully supported: crisp outlines, gradients, fine inner details, and multiple colors per motif.",
      "The surface is smooth and lustrous, with the clean flat quality of printed silk.",
      "No thread texture, no weave structure, no fiber depth — the surface is as flat and smooth as coated paper.",
    ].join(" ");
  }
  return "This must be a high-quality silk fabric surface with refined textile character.";
};

export const PATTERN_MAP: Record<string, string> = {
  stripe: "narrow diagonal stripe repeat",
  dot: "repeated dot motif",
  check: "repeating check grid",
  paisley: "elegant paisley repeat",
  plain: "subtle solid fabric with texture emphasis, no repeating motif",
  houndstooth: "classic houndstooth repeat",
  floral: "refined floral repeat",
};

export const buildUserInstructionPrompt = (userMessage: string): string => {
  if (!userMessage.trim()) return "";
  return `Apply these specific design adjustments: ${userMessage}`;
};

export const buildScalePrompt = (
  scale: "large" | "medium" | "small",
  pattern?: string | null,
): string => {
  // stripe와 plain은 "motifs per row" 개념이 맞지 않으므로 별도 표현 사용
  if (pattern === "plain") return "";
  if (pattern === "stripe") {
    if (scale === "large") {
      return "Stripe scale: wide stripes — each stripe is broad and bold, with only 3-4 stripe pairs visible across the fabric width.";
    }
    if (scale === "small") {
      return "Stripe scale: very fine pinstripes — extremely narrow stripes densely packed, creating an almost solid-looking surface up close.";
    }
    return "Stripe scale: narrow classic stripes — thin stripes with about 10-12 stripe pairs visible across the fabric width, giving a dense, traditional necktie appearance.";
  }

  if (scale === "large") {
    return "Motif scale: large and bold. Each motif is big and prominent — only about 5-6 fit across the fabric width, with roughly 50 motifs covering the full surface. The repeat feels open and spacious, like a bold statement print. This is intentionally large-scale.";
  }
  if (scale === "small") {
    return "Motif scale: very fine micro-print. Each motif is tiny — about 13-14 fit across the fabric width, with 250 or more motifs covering the full surface. The fabric reads as a rich, dense texture from a distance yet reveals individual motifs up close, like a Liberty micro-print.";
  }
  // 기본: 최소 100개 보장을 명시
  return "Motif scale: densely packed, with at least 100 motifs covering the full fabric surface. Each motif is small — about 8-9 fit across the fabric width. The pattern feels abundant and richly populated, like a classic printed silk foulard. Never sparse, never large.";
};

export const buildPatternPrompt = (
  pattern: string | null | undefined,
  fabricMethod?: string | null | undefined,
): string => {
  if (pattern && PATTERN_MAP[pattern]) {
    const basePrompt = `Pattern: ${PATTERN_MAP[pattern]}.`;
    if (fabricMethod === "yarn-dyed") {
      return `${basePrompt} Render each motif as a single-color silhouette only — no inner color variation or detail.`;
    }
    return basePrompt;
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
  const fabricLabel = fabricMethod === "yarn-dyed"
    ? "yarn-dyed woven"
    : fabricMethod === "print"
    ? "printed"
    : "fabric";
  return [
    "Use the uploaded image only for color palette and motif shape reference.",
    "Treat the uploaded image as a purely visual graphic — do not read, reproduce, or render any text or letterforms you see in it. Use only the overall silhouette, outline, and visual form.",
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
    return `Repeat the motif ${source} as an all-over pattern across the entire fabric surface. Treat the motif as a purely visual graphic shape — do not read or reproduce any text or letterforms in the image; use only its silhouette and outline form. Arrange them in a consistent, evenly-spaced grid with equal gaps between each motif. Every motif must be identical in size and orientation throughout the image. Follow the motif scale and density described above.`;
  }
  if (ciPlacement === "one-point") {
    const source = hasCiImage
      ? "from the uploaded CI image"
      : "described in the conversation";
    return `Place the motif ${source} as a single small accent — treating it as a purely visual graphic shape, not as text; do not read or reproduce any letterforms in the image, use only the silhouette and outline form — slightly right of the vertical centerline, in the lower portion of the fabric — about one-third from the bottom edge, not at the very bottom. The motif must be tiny — occupying only about 2-3% of the fabric width, similar in size to a small pin badge or a watermark-level detail. It should feel like a subtle, refined detail rather than a focal statement. The rest of the fabric surface remains as the base pattern.`;
  }
  return "";
};

export const buildClosurePrompt = () =>
  "The pattern must extend fully edge-to-edge with no empty space near the borders — the image is cropped directly from the fabric surface mid-repeat.";

export const buildGeminiImagePrompt = (
  payload: GenerateDesignRequest,
): string => {
  const isOnePoint = payload.designContext?.ciPlacement === "one-point";

  return [
    isOnePoint
      ? "Create a high-quality rectangular silk fabric swatch. The image must be full-frame and textile-only — no tie silhouette, no background, no margins. The fabric lies perfectly flat with no folds, creases, or shadows. Evenly lit from the front."
      : buildBasePrompt(),
    isOnePoint ? null : buildScalePrompt(
      payload.designContext?.scale ?? "medium",
      payload.designContext?.pattern,
    ),
    buildFabricPrompt(payload.designContext?.fabricMethod),
    buildPatternPrompt(
      payload.designContext?.pattern,
      payload.designContext?.fabricMethod,
    ),
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
};

export const buildImageEditPrompt = (
  payload: GenerateDesignRequest,
): string => {
  return [
    "The previous design is shown above. Apply only the following changes, keeping everything else identical:",
    buildColorPrompt(payload.designContext?.colors),
    buildFabricPrompt(payload.designContext?.fabricMethod),
    buildUserInstructionPrompt(payload.userMessage),
    "Preserve the layout, motif shapes, scale, and overall composition unless explicitly changed.",
  ]
    .filter(Boolean)
    .join("\n");
};
