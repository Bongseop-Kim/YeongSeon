import type { GenerateDesignRequest } from "./index.ts";

export const SYSTEM_PROMPT =
  `당신은 넥타이 디자인을 제안하는 AI 어시스턴트입니다.
항상 한국어로만 응답하세요.
응답은 반드시 다음 JSON 형식만 반환하세요:
{"aiMessage": "...", "contextChips": [{"label": "...", "action": "..."}]}
contextChips의 action은 후속 대화에 사용할 짧은 문장입니다. 예: {"label": "색상 변경", "action": "색상을 파란색으로 바꿔줘"}`;

export const parseJsonBlock = (
  value: string,
): { aiMessage?: string; contextChips?: unknown } => {
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
  const history = payload.conversationHistory
    ?.map((item) =>
      `${item.role === "user" ? "사용자" : "AI"}: ${item.content}`
    )
    .join("\n") || "없음";

  return [
    "넥타이 디자인 상담 정보를 바탕으로 다음 응답을 생성하세요.",
    `designContext.colors: ${colors}`,
    `designContext.pattern: ${pattern}`,
    `designContext.fabricMethod: ${fabricMethod}`,
    `userMessage: ${payload.userMessage}`,
    `conversationHistory:\n${history}`,
    "contextChips는 후속 대화에 바로 사용할 수 있는 짧은 액션 2~3개로 구성하세요.",
  ].join("\n");
};

export const buildBasePrompt = () =>
  "Create a high-quality rectangular silk fabric swatch, full-frame textile-only image, evenly lit, front-facing flat fabric sample, suitable for later masking onto a tie silhouette.";

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
  stripe: "diagonal stripe repeat",
  dot: "small repeated dot motif",
  check: "repeating check grid",
  paisley: "elegant paisley repeat",
  plain: "subtle solid fabric with texture emphasis",
  houndstooth: "classic houndstooth repeat",
  floral: "refined floral repeat",
};

export const buildPatternPrompt = (
  pattern: string | null | undefined,
  userMessage: string,
  hasReferenceImage: boolean,
): string => {
  if (pattern && pattern !== "custom" && PATTERN_MAP[pattern]) {
    return `Pattern: ${PATTERN_MAP[pattern]}.`;
  }
  if (pattern === "custom") {
    if (userMessage.trim()) {
      return `Pattern: infer pattern from this description: ${userMessage}.`;
    }
    if (hasReferenceImage) {
      return "Pattern: infer pattern density and structure from the reference image.";
    }
    return "Pattern: classic diagonal stripe repeat with balanced symmetry.";
  }
  return "";
};

export const buildColorPrompt = (colors: string[] | undefined): string => {
  if (!colors || colors.length === 0) return "";
  const [base, ...rest] = colors;
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
    `The fabric construction method is strictly ${fabricLabel}, regardless of the image style.`,
    "Keep the final result as a clean rectangular fabric swatch.",
  ].join(" ");
};

export const buildClosurePrompt = () =>
  "Show only the fabric surface itself. The entire frame must be filled with textile material only. This image is a rectangular fabric swatch, nothing else.";

export const buildGeminiImagePrompt = (
  payload: GenerateDesignRequest,
): string =>
  [
    buildBasePrompt(),
    buildFabricPrompt(payload.designContext?.fabricMethod),
    buildPatternPrompt(
      payload.designContext?.pattern,
      payload.userMessage,
      !!payload.referenceImageBase64,
    ),
    buildColorPrompt(payload.designContext?.colors),
    buildReferencePrompt(
      !!payload.ciImageBase64,
      !!payload.referenceImageBase64,
      payload.designContext?.fabricMethod,
    ),
    buildClosurePrompt(),
  ]
    .filter(Boolean)
    .join("\n");
