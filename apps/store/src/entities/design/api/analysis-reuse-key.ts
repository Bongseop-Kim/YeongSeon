import type { DesignContext } from "@/entities/design/model/design-context";

interface AnalysisReuseKeyInput {
  colors: readonly string[] | null;
  pattern: string | null;
  fabricMethod: string | null;
  ciPlacement: string | null;
  baseImageWorkId: string | null;
  ciImageHash: string | null | undefined;
  referenceImageHash: string | null | undefined;
  baseImageUrl: string | null;
}

const normalizeBaseImageUrl = (baseImageUrl: string | null): string => {
  if (typeof baseImageUrl !== "string") {
    return "";
  }

  const trimmedValue = baseImageUrl.trim();
  if (trimmedValue.length === 0) {
    return "";
  }

  try {
    return new URL(trimmedValue).toString();
  } catch {
    return trimmedValue;
  }
};

function serializeAnalysisReuseKeyInput(input: AnalysisReuseKeyInput): string {
  const parts = [
    (input.colors ?? []).join(","),
    input.pattern ?? "",
    input.fabricMethod ?? "",
    input.ciPlacement ?? "",
    input.baseImageWorkId ?? "",
    input.ciImageHash ?? "",
    input.referenceImageHash ?? "",
    normalizeBaseImageUrl(input.baseImageUrl),
  ];

  return parts.join("|");
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildAnalysisReuseKey(input: AnalysisReuseKeyInput): string {
  return fnv1a32(serializeAnalysisReuseKeyInput(input));
}

const toSerializableFileMetadata = (file: File | null) =>
  file
    ? {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      }
    : null;

const hashFileMetadata = (file: File | null): string | null =>
  file ? fnv1a32(JSON.stringify(toSerializableFileMetadata(file))) : null;

export function createAnalysisReuseKeyForContext(
  designContext: DesignContext,
  baseImageUrl: string | null,
  baseImageWorkId: string | null,
): string {
  return buildAnalysisReuseKey({
    colors: designContext.colors,
    pattern: designContext.pattern,
    fabricMethod: designContext.fabricMethod,
    ciPlacement: designContext.ciPlacement,
    ciImageHash: hashFileMetadata(designContext.ciImage),
    referenceImageHash: hashFileMetadata(designContext.referenceImage),
    baseImageUrl,
    baseImageWorkId,
  });
}
