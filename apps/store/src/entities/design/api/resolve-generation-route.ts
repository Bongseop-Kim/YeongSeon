import type {
  GenerationRoute,
  GenerationRouteReason,
  GenerationRouteSignal,
} from "@/entities/design/model/ai-design-request";

interface RouteResolverInput {
  userMessage: string;
  hasCiImage: boolean;
  hasReferenceImage: boolean;
  hasPreviousGeneratedImage: boolean;
  selectedPreviewImageUrl: string | null;
}

interface RouteResolution {
  route: GenerationRoute;
  signals: GenerationRouteSignal[];
  reason: GenerationRouteReason;
  usedIntentRouter: boolean;
}

const PATTERN_REPEAT_KEYWORDS = [
  "올패턴",
  "올 패턴",
  "반복 패턴",
  "반복패턴",
  "패턴 반복",
  "전체 반복",
  "전체에 반복",
  "전면 반복",
  "반복",
  "repeat",
  "tile",
  "tiling",
];

const NEGATED_REPEAT_PATTERNS = [
  /(?:^|\s)반복(?:\s*말고|\s*하지\s*말고|\s*은\s*아니고|\s*대신)/,
  /(?:^|\s)(?:don't|do not|never)\s+repeat(?:\b|[.,!?;:)]|\s|$)/,
  /(?:^|\s)no\s+repeat(?:\b|[.,!?;:)]|\s|$)/,
  /(?:^|\s)without\s+repeat(?:ing)?(?:\b|[.,!?;:)]|\s|$)/,
  /repeat(?:\s*말고|\s*하지\s*말고)(?:\b|[.,!?;:)]|\s|$)/,
  /(?:^|\s)(?:don't|do not|never)\s+til(?:e|ing)(?:\b|[.,!?;:)]|\s|$)/,
  /(?:^|\s)no\s+til(?:e|ing)(?:\b|[.,!?;:)]|\s|$)/,
  /(?:^|\s)without\s+til(?:e|ing)(?:\b|[.,!?;:)]|\s|$)/,
] as const;

const EXACT_PLACEMENT_KEYWORDS = [
  "위치",
  "배치",
  "자리",
  "옮겨",
  "내려",
  "올려",
  "왼쪽",
  "오른쪽",
  "좌측",
  "우측",
  "하단",
  "상단",
  "가운데",
  "중앙",
  "포인트",
  "move",
  "shift",
  "place",
  "position",
  "align",
  "down",
  "up",
  "left",
  "right",
];

const MODIFICATION_INTENT_KEYWORDS = [
  "수정",
  "변경",
  "편집",
  "조정",
  "조절",
  "바꿔",
  "고쳐",
  "줄여",
  "늘려",
  "작게",
  "크게",
  "좁게",
  "넓게",
  "덜",
  "더",
  "밀도",
  "간격",
  "크기",
  "사이즈",
  "density",
  "size",
  "scale",
  "spacing",
  "smaller",
  "larger",
  "reduce",
  "increase",
  "adjust",
  "compress",
  "spread",
];

const PRESERVE_IDENTITY_KEYWORDS = [
  "그대로",
  "같게",
  "동일하게",
  "일치",
  "유지",
  "원본",
  "로고",
  "심볼",
  "ci",
  "identical",
  "same",
];

const SIMILAR_MOOD_KEYWORDS = [
  "참고해서",
  "비슷하게",
  "느낌",
  "무드",
  "분위기",
  "스타일",
  "유사하게",
  "닮게",
  "similar",
];

const NEW_GENERATION_KEYWORDS = [
  "새로",
  "새롭게",
  "다시",
  "재생성",
  "새 디자인",
  "새시안",
  "새 시안",
  "만들어줘",
  "생성해줘",
  "create",
  "generate",
];

const EDIT_INTENT_SIGNALS = new Set<GenerationRouteSignal>([
  "edit_only",
  "exact_placement",
  "modification_intent",
]);

const isAsciiWordChar = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 122);
};

const isAsciiKeywordPhrase = (value: string): boolean => {
  let sawWordChar = false;
  let previousWasSpace = false;

  for (const char of value) {
    if (isAsciiWordChar(char)) {
      sawWordChar = true;
      previousWasSpace = false;
      continue;
    }

    if (char === " " && sawWordChar && !previousWasSpace) {
      previousWasSpace = true;
      continue;
    }

    return false;
  }

  return sawWordChar && !previousWasSpace;
};

const splitAsciiWords = (value: string): string[] => {
  const words: string[] = [];
  let current = "";

  for (const char of value) {
    if (isAsciiWordChar(char)) {
      current += char;
      continue;
    }

    if (current.length > 0) {
      words.push(current);
      current = "";
    }
  }

  if (current.length > 0) {
    words.push(current);
  }

  return words;
};

const matchesAsciiKeyword = (haystack: string, keyword: string): boolean => {
  const haystackWords = splitAsciiWords(haystack);
  const keywordWords = keyword.split(" ");

  if (keywordWords.length === 1) {
    return haystackWords.includes(keywordWords[0]);
  }

  for (
    let startIndex = 0;
    startIndex <= haystackWords.length - keywordWords.length;
    startIndex += 1
  ) {
    const matchesWindow = keywordWords.every(
      (word, offset) => haystackWords[startIndex + offset] === word,
    );

    if (matchesWindow) {
      return true;
    }
  }

  return false;
};

const normalizeMessage = (value: string): string => value.trim().toLowerCase();

const matchesKeyword = (haystack: string, keyword: string): boolean => {
  if (isAsciiKeywordPhrase(keyword)) {
    return matchesAsciiKeyword(haystack, keyword);
  }

  return haystack.includes(keyword);
};

const includesAny = (haystack: string, keywords: string[]): boolean =>
  keywords.some((keyword) => matchesKeyword(haystack, keyword));

const hasNegatedRepeatIntent = (rawMessage: string): boolean => {
  const normalizedMessage = rawMessage.replace(/\s+/g, " ");
  return NEGATED_REPEAT_PATTERNS.some((pattern) =>
    pattern.test(normalizedMessage),
  );
};

function collectSignals(input: RouteResolverInput): GenerationRouteSignal[] {
  const signals: GenerationRouteSignal[] = [];
  const rawMessage = normalizeMessage(input.userMessage);
  const compactMessage = rawMessage.replace(/\s+/g, "");
  const haystacks = [rawMessage, compactMessage];
  const matches = (keywords: string[]) =>
    haystacks.some((haystack) => includesAny(haystack, keywords));

  if (input.hasCiImage) {
    signals.push("ci_image_present");
  }

  if (input.hasReferenceImage) {
    signals.push("reference_image_present");
  }

  if (input.hasPreviousGeneratedImage) {
    signals.push("previous_generated_image_present");
  }

  if (input.selectedPreviewImageUrl?.trim()) {
    signals.push("selected_preview_image_present");
  }

  if (matches(PATTERN_REPEAT_KEYWORDS) && !hasNegatedRepeatIntent(rawMessage)) {
    signals.push("pattern_repeat");
  }

  if (matches(EXACT_PLACEMENT_KEYWORDS)) {
    signals.push("exact_placement");
  }

  if (matches(MODIFICATION_INTENT_KEYWORDS)) {
    signals.push("modification_intent");
  }

  if (matches(PRESERVE_IDENTITY_KEYWORDS)) {
    signals.push("preserve_identity");
  }

  if (matches(SIMILAR_MOOD_KEYWORDS)) {
    signals.push("similar_mood");
  }

  if (matches(NEW_GENERATION_KEYWORDS)) {
    signals.push("new_generation");
  }

  const hasEditTarget =
    input.hasPreviousGeneratedImage ||
    Boolean(input.selectedPreviewImageUrl?.trim());

  if (
    input.hasCiImage &&
    signals.includes("pattern_repeat") &&
    !signals.includes("preserve_identity")
  ) {
    signals.push("preserve_identity");
  }

  if (
    hasEditTarget &&
    !signals.includes("similar_mood") &&
    !signals.includes("new_generation") &&
    signals.some((signal) => EDIT_INTENT_SIGNALS.has(signal))
  ) {
    signals.push("edit_only");
  }

  return signals;
}

export function resolveGenerationRoute(
  input: RouteResolverInput,
): RouteResolution {
  const signals = collectSignals(input);
  const hasEditTarget =
    input.hasPreviousGeneratedImage ||
    Boolean(input.selectedPreviewImageUrl?.trim());

  if (hasEditTarget && signals.includes("edit_only")) {
    return {
      route: "fal_edit",
      signals,
      reason: "existing_result_edit_request",
      usedIntentRouter: false,
    };
  }

  if (input.hasCiImage && signals.includes("pattern_repeat")) {
    return {
      route: "fal_tiling",
      signals,
      reason: "ci_image_with_pattern_repeat",
      usedIntentRouter: false,
    };
  }

  if (signals.includes("similar_mood") || signals.includes("new_generation")) {
    return {
      route: "openai",
      signals,
      reason: "similar_mood_or_new_generation",
      usedIntentRouter: false,
    };
  }

  return {
    route: "openai",
    signals,
    reason: "default_openai_generation",
    usedIntentRouter: false,
  };
}
