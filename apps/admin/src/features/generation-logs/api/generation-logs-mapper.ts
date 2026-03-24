import type {
  AdminGenerationLogItem,
  ErrorDistribution,
  GenerationStatsData,
  GenerationSummaryStats,
  InputTypeStats,
  ModelStats,
  PatternStats,
} from "@/features/generation-logs/types/admin-generation-log";

// ── helpers ──────────────────────────────────────────────────

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function toString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toBoolean(v: unknown): boolean {
  return v === true;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// ── 로그 행 ──────────────────────────────────────────────────

type GenerationLogRow = {
  id: unknown;
  work_id: unknown;
  user_id: unknown;
  ai_model: unknown;
  request_type: unknown;
  quality: unknown;
  user_message: unknown;
  prompt_length: unknown;
  design_context: unknown;
  conversation_turn: unknown;
  has_ci_image: unknown;
  has_reference_image: unknown;
  has_previous_image: unknown;
  ai_message: unknown;
  generate_image: unknown;
  image_generated: unknown;
  detected_design: unknown;
  tokens_charged: unknown;
  tokens_refunded: unknown;
  text_latency_ms: unknown;
  image_latency_ms: unknown;
  total_latency_ms: unknown;
  error_type: unknown;
  created_at: unknown;
};

function toRequestType(v: unknown): "text_only" | "text_and_image" | null {
  if (v === "text_only" || v === "text_and_image") return v;
  return null;
}

function toQuality(v: unknown): "standard" | "high" | null {
  if (v === "standard" || v === "high") return v;
  return null;
}

function toAiModel(v: unknown): "openai" | "gemini" {
  if (v === "openai" || v === "gemini") return v;
  console.warn(`[toAiModel] Invalid ai_model value: ${String(v)}`);
  return "openai";
}

export function toAdminGenerationLogItem(
  row: GenerationLogRow,
): AdminGenerationLogItem {
  return {
    id: toString(row.id) ?? "",
    workId: toString(row.work_id) ?? "",
    userId: toString(row.user_id) ?? "",
    aiModel: toAiModel(row.ai_model),
    requestType: toRequestType(row.request_type),
    quality: toQuality(row.quality),
    userMessage: toString(row.user_message) ?? "",
    promptLength: toNumber(row.prompt_length),
    designContext: isRecord(row.design_context)
      ? (row.design_context as AdminGenerationLogItem["designContext"])
      : null,
    conversationTurn: toNumber(row.conversation_turn),
    hasCiImage: toBoolean(row.has_ci_image),
    hasReferenceImage: toBoolean(row.has_reference_image),
    hasPreviousImage: toBoolean(row.has_previous_image),
    aiMessage: toString(row.ai_message),
    generateImage:
      typeof row.generate_image === "boolean" ? row.generate_image : null,
    imageGenerated: toBoolean(row.image_generated),
    detectedDesign: isRecord(row.detected_design)
      ? (row.detected_design as Record<string, unknown>)
      : null,
    tokensCharged: toNumber(row.tokens_charged),
    tokensRefunded: toNumber(row.tokens_refunded),
    textLatencyMs:
      typeof row.text_latency_ms === "number" ? row.text_latency_ms : null,
    imageLatencyMs:
      typeof row.image_latency_ms === "number" ? row.image_latency_ms : null,
    totalLatencyMs:
      typeof row.total_latency_ms === "number" ? row.total_latency_ms : null,
    errorType: toString(row.error_type),
    createdAt: toString(row.created_at) ?? "",
  };
}

// ── 통계 ─────────────────────────────────────────────────────

export function toGenerationStatsData(raw: unknown): GenerationStatsData {
  if (!isRecord(raw)) {
    return {
      summary: {
        totalRequests: 0,
        imageSuccessRate: 0,
        totalTokensConsumed: 0,
        avgTotalLatencyMs: 0,
      },
      byModel: [],
      byInputType: [],
      byPattern: [],
      byError: [],
    };
  }

  const summary = isRecord(raw.summary) ? raw.summary : {};
  const parsedSummary: GenerationSummaryStats = {
    totalRequests: toNumber(summary.total_requests),
    imageSuccessRate: toNumber(summary.image_success_rate),
    totalTokensConsumed: toNumber(summary.total_tokens_consumed),
    avgTotalLatencyMs: toNumber(summary.avg_total_latency_ms),
  };

  const byModel: ModelStats[] = Array.isArray(raw.by_model)
    ? raw.by_model.filter(isRecord).map((m) => ({
        aiModel: toString(m.ai_model) ?? "",
        requestCount: toNumber(m.request_count),
        avgTextLatencyMs: toNumber(m.avg_text_latency_ms),
        avgImageLatencyMs: toNumber(m.avg_image_latency_ms),
        avgTokenCost: toNumber(m.avg_token_cost),
        imageSuccessRate: toNumber(m.image_success_rate),
      }))
    : [];

  const byInputType: InputTypeStats[] = Array.isArray(raw.by_input_type)
    ? raw.by_input_type.filter(isRecord).map((it) => ({
        inputType: toString(it.input_type) ?? "",
        requestCount: toNumber(it.request_count),
        imageSuccessRate: toNumber(it.image_success_rate),
        avgLatencyMs: toNumber(it.avg_latency_ms),
        avgTokenCost: toNumber(it.avg_token_cost),
      }))
    : [];

  const byPattern: PatternStats[] = Array.isArray(raw.by_pattern)
    ? raw.by_pattern.filter(isRecord).map((p) => ({
        pattern: toString(p.pattern) ?? "(미지정)",
        requestCount: toNumber(p.request_count),
        imageSuccessRate: toNumber(p.image_success_rate),
        avgTokenCost: toNumber(p.avg_token_cost),
      }))
    : [];

  const byError: ErrorDistribution[] = Array.isArray(raw.by_error)
    ? raw.by_error.filter(isRecord).map((e) => ({
        errorType: toString(e.error_type) ?? "성공",
        count: toNumber(e.count),
      }))
    : [];

  return { summary: parsedSummary, byModel, byInputType, byPattern, byError };
}
