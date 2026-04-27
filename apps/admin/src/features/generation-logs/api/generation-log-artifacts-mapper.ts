import type { AdminGenerationArtifactItem } from "@/features/generation-logs/types/admin-generation-artifact";
import {
  isSafeInteger,
  parseNumberWith,
} from "@/features/generation-logs/api/generation-logs-mapper";
import { isRecord } from "@/utils/type-guards";

function toStringOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toNumberOrNull(v: unknown): number | null {
  return parseNumberWith(v, isSafeInteger);
}

function toArtifactPhase(v: unknown): "render" | undefined {
  if (v === "render") {
    return v;
  }
  return undefined;
}

function toArtifactStatus(v: unknown): "success" | "partial" | "failed" {
  if (v === "success" || v === "partial" || v === "failed") {
    return v;
  }

  console.warn("[toArtifactStatus] Invalid status value", { status: v });
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
  const storageProvider = toStringOrNull(row.storage_provider);

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

  if (row.storage_provider != null && storageProvider === null) {
    console.warn("[toAdminGenerationArtifactItem] Invalid storage_provider", {
      id,
      workflowId,
      storageProvider: row.storage_provider,
    });
  }

  return {
    id,
    workflowId,
    ...(phase ? { phase } : {}),
    artifactType: toStringOrNull(row.artifact_type) ?? "",
    sourceWorkId: toStringOrNull(row.source_work_id),
    parentArtifactId: toStringOrNull(row.parent_artifact_id),
    storageProvider,
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
