import type { AdminGenerationArtifactItem } from "@/features/generation-logs/types/admin-generation-artifact";

function toStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

const toNumberOrNull = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isSafeInteger(v)) {
    return v;
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (/^[+-]?\d+$/.test(trimmed)) {
      try {
        const parsed = BigInt(trimmed);
        if (
          parsed > BigInt(Number.MAX_SAFE_INTEGER) ||
          parsed < BigInt(Number.MIN_SAFE_INTEGER)
        ) {
          return null;
        }

        return Number(parsed);
      } catch {
        return null;
      }
    }
  }
  if (
    typeof v === "bigint" &&
    v <= BigInt(Number.MAX_SAFE_INTEGER) &&
    v >= BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    return Number(v);
  }
  return null;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function toArtifactPhase(
  v: unknown,
): "analysis" | "prep" | "render" | undefined {
  if (v === "analysis" || v === "prep" || v === "render") {
    return v;
  }
  return undefined;
}

function toArtifactStatus(v: unknown): "success" | "partial" | "failed" {
  if (v === "success" || v === "partial" || v === "failed") {
    return v;
  }

  return "failed";
}

type GenerationArtifactRow = {
  id: unknown;
  workflow_id: unknown;
  phase?: unknown;
  artifact_type: unknown;
  source_work_id?: unknown;
  parent_artifact_id?: unknown;
  storage_provider: unknown;
  image_url?: unknown;
  image_width?: unknown;
  image_height?: unknown;
  mime_type?: unknown;
  file_size_bytes?: unknown;
  status: unknown;
  meta: unknown;
  created_at: unknown;
};

export function toAdminGenerationArtifactItem(
  row: GenerationArtifactRow,
): AdminGenerationArtifactItem {
  const phase = toArtifactPhase(row.phase);
  const id = toStringOrNull(row.id);
  const workflowId = toStringOrNull(row.workflow_id);
  const createdAt = toStringOrNull(row.created_at);

  for (const [field, value] of [
    ["id", id],
    ["workflow_id", workflowId],
    ["created_at", createdAt],
  ] as const) {
    if (value === null) {
      console.warn("[toAdminGenerationArtifactItem] Invalid critical field", {
        field,
        row,
      });
    }
  }

  return {
    id,
    workflowId,
    ...(phase ? { phase } : {}),
    artifactType: toStringOrNull(row.artifact_type) ?? "",
    sourceWorkId: toStringOrNull(row.source_work_id),
    parentArtifactId: toStringOrNull(row.parent_artifact_id),
    storageProvider: toStringOrNull(row.storage_provider) ?? "imagekit",
    imageUrl: toStringOrNull(row.image_url),
    imageWidth: toNumberOrNull(row.image_width),
    imageHeight: toNumberOrNull(row.image_height),
    mimeType: toStringOrNull(row.mime_type),
    fileSizeBytes: toNumberOrNull(row.file_size_bytes),
    status: toArtifactStatus(row.status),
    meta: isRecord(row.meta) ? row.meta : {},
    createdAt,
  };
}
