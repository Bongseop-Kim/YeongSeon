import type { FabricType } from "./types.ts";

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

export function matchKeyword(message: string, keywords: string[]): boolean {
  const lower = message.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

// Priority is explicit: yarn-dyed keywords > printed keywords > UI selection > previous value > default.
export function resolveFabricType(
  uiSelection: FabricType | null,
  userMessage: string,
  previousFabricType: FabricType | null,
): FabricType {
  if (matchKeyword(userMessage, YARN_DYED_KEYWORDS)) return "yarn_dyed";
  if (matchKeyword(userMessage, PRINTED_KEYWORDS)) return "printed";
  if (uiSelection) return uiSelection;
  if (previousFabricType) return previousFabricType;
  return "printed";
}
