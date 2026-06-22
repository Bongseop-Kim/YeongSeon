import type {
  AdminSeamlessLogCandidate,
  AdminSeamlessLogItem,
  SeamlessInputTypeFilter,
  SeamlessInputTypeStats,
  SeamlessStatsData,
  SeamlessStatusFilter,
  SeamlessStatusStats,
  SeamlessSummaryStats,
} from "@/features/seamless-logs/types/admin-seamless-log";
import { isRecord } from "@/utils/type-guards";

const isSafeFinite = (n: number): boolean =>
  Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER;

function parseNumber(v: unknown): number | null {
  if (typeof v === "bigint") {
    const n = Number(v);
    return isSafeFinite(n) ? n : null;
  }
  if (typeof v === "number") return isSafeFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return isSafeFinite(n) ? n : null;
  }
  return null;
}

function toStatsNumber(v: unknown): number {
  return parseNumber(v) ?? 0;
}

function toString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toBoolean(v: unknown): boolean {
  return v === true;
}

function toInputType(v: unknown): SeamlessInputTypeFilter | null {
  if (v === "intent" || v === "prompt" || v === "reference_image") return v;
  return null;
}

function toStatus(v: unknown): SeamlessStatusFilter | null {
  if (v === "success" || v === "partial" || v === "error") return v;
  return null;
}

function toWarnings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === "string");
}

function toCandidates(v: unknown): AdminSeamlessLogCandidate[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isRecord).map((c) => ({
    id: toString(c.id),
    layoutId: toString(c.layout_id),
    sourceFidelity: toString(c.source_fidelity),
    colorwayId: toString(c.colorway_id),
    seed: parseNumber(c.seed),
    pngUrl: toString(c.png_url),
    svg: toString(c.svg),
  }));
}

type SeamlessLogRow = {
  id: unknown;
  request_id: unknown;
  input_type: unknown;
  prompt: unknown;
  has_reference_image: unknown;
  reference_image_bytes: unknown;
  colorway: unknown;
  seed: unknown;
  candidate_count_requested: unknown;
  candidate_count_returned: unknown;
  distinct_layouts: unknown;
  available_strategies: unknown;
  engine_version: unknown;
  registry_version: unknown;
  intent?: unknown;
  candidates: unknown;
  warnings: unknown;
  generate_ms: unknown;
  render_ms: unknown;
  status: unknown;
  error_type: unknown;
  error_message: unknown;
  created_at: unknown;
};

export function toAdminSeamlessLogItem(
  row: SeamlessLogRow,
): AdminSeamlessLogItem {
  return {
    id: toString(row.id) ?? "",
    requestId: toString(row.request_id),
    inputType: toInputType(row.input_type),
    prompt: toString(row.prompt),
    hasReferenceImage: toBoolean(row.has_reference_image),
    referenceImageBytes: parseNumber(row.reference_image_bytes),
    colorway: toString(row.colorway),
    seed: parseNumber(row.seed),
    candidateCountRequested: parseNumber(row.candidate_count_requested),
    candidateCountReturned: parseNumber(row.candidate_count_returned),
    distinctLayouts: parseNumber(row.distinct_layouts),
    availableStrategies: parseNumber(row.available_strategies),
    engineVersion: toString(row.engine_version),
    registryVersion: toString(row.registry_version),
    intent: isRecord(row.intent) ? row.intent : null,
    candidates: toCandidates(row.candidates),
    warnings: toWarnings(row.warnings),
    generateMs: parseNumber(row.generate_ms),
    renderMs: parseNumber(row.render_ms),
    status: toStatus(row.status),
    errorType: toString(row.error_type),
    errorMessage: toString(row.error_message),
    createdAt: toString(row.created_at) ?? "",
  };
}

export function toSeamlessStatsData(raw: unknown): SeamlessStatsData {
  const empty: SeamlessStatsData = {
    summary: {
      total: 0,
      successCount: 0,
      partialCount: 0,
      errorCount: 0,
      avgGenerateMs: 0,
      avgRenderMs: 0,
    },
    byInputType: [],
    byStatus: [],
  };
  if (!isRecord(raw)) return empty;

  const summaryRaw = isRecord(raw.summary) ? raw.summary : {};
  const summary: SeamlessSummaryStats = {
    total: toStatsNumber(summaryRaw.total),
    successCount: toStatsNumber(summaryRaw.success_count),
    partialCount: toStatsNumber(summaryRaw.partial_count),
    errorCount: toStatsNumber(summaryRaw.error_count),
    avgGenerateMs: toStatsNumber(summaryRaw.avg_generate_ms),
    avgRenderMs: toStatsNumber(summaryRaw.avg_render_ms),
  };

  const byInputType: SeamlessInputTypeStats[] = Array.isArray(raw.by_input_type)
    ? raw.by_input_type.filter(isRecord).map((it) => ({
        inputType: toString(it.input_type) ?? "(미지정)",
        count: toStatsNumber(it.count),
      }))
    : [];

  const byStatus: SeamlessStatusStats[] = Array.isArray(raw.by_status)
    ? raw.by_status.filter(isRecord).map((s) => ({
        status: toString(s.status) ?? "(미지정)",
        count: toStatsNumber(s.count),
      }))
    : [];

  return { summary, byInputType, byStatus };
}
