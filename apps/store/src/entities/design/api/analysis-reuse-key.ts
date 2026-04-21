export interface AnalysisReuseKeyInput {
  colors: readonly string[] | null;
  pattern: string | null;
  fabricMethod: string | null;
  ciPlacement: string | null;
  baseImageWorkId: string | null;
  ciImageHash: string | null | undefined;
  referenceImageHash: string | null | undefined;
  baseImageUrl: string | null;
}

function normalize(input: AnalysisReuseKeyInput): string {
  const parts = [
    (input.colors ?? []).join(","),
    input.pattern ?? "",
    input.fabricMethod ?? "",
    input.ciPlacement ?? "",
    input.baseImageWorkId ?? "",
    input.ciImageHash ?? "",
    input.referenceImageHash ?? "",
    input.baseImageUrl ?? "",
  ];

  return parts.join("|");
}

export function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildAnalysisReuseKey(input: AnalysisReuseKeyInput): string {
  return fnv1a32(normalize(input));
}
