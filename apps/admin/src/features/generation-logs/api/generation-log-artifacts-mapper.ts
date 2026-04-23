import type { AdminGenerationArtifactItem } from "@/features/generation-logs/types/admin-generation-artifact";

function toString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

const toNumberOrNull = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof v === "bigint" && Number.isFinite(Number(v))) {
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

  return {
    id: toString(row.id) ?? "",
    workflowId: toString(row.workflow_id) ?? "",
    ...(phase ? { phase } : {}),
    artifactType: toString(row.artifact_type) ?? "",
    sourceWorkId: toString(row.source_work_id),
    parentArtifactId: toString(row.parent_artifact_id),
    storageProvider: toString(row.storage_provider) ?? "imagekit",
    imageUrl: toString(row.image_url),
    imageWidth: toNumberOrNull(row.image_width),
    imageHeight: toNumberOrNull(row.image_height),
    mimeType: toString(row.mime_type),
    fileSizeBytes: toNumberOrNull(row.file_size_bytes),
    status: toArtifactStatus(row.status),
    meta: isRecord(row.meta) ? row.meta : {},
    createdAt: toString(row.created_at) ?? "",
  };
}
