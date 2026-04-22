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
const REQUEST_ATTACHMENT_TYPES = [
  "color",
  "pattern",
  "fabric",
  "image",
  "ci-placement",
] as const;
const REQUEST_ATTACHMENT_TYPE_SET: ReadonlySet<string> = new Set(
  REQUEST_ATTACHMENT_TYPES,
);

function isAllowedAttachmentType(
  value: unknown,
): value is NonNullable<
  AdminGenerationLogItem["requestAttachments"]
>[number]["type"] {
  return typeof value === "string" && REQUEST_ATTACHMENT_TYPE_SET.has(value);
}

// ── 로그 행 ──────────────────────────────────────────────────

type GenerationLogRow = {
  id: unknown;
  workflow_id?: unknown;
  phase?: unknown;
  work_id: unknown;
  parent_work_id?: unknown;
  user_id: unknown;
  ai_model: unknown;
  request_type: unknown;
  quality: unknown;
  user_message: unknown;
  prompt_length: unknown;
  request_attachments?: unknown;
  design_context: unknown;
  normalized_design?: unknown;
  conversation_turn: unknown;
  has_ci_image: unknown;
  has_reference_image: unknown;
  has_previous_image: unknown;
  ai_message: unknown;
  generate_image: unknown;
  eligible_for_render?: unknown;
  missing_requirements?: unknown;
  eligibility_reason?: unknown;
  text_prompt?: unknown;
  image_prompt?: unknown;
  image_edit_prompt?: unknown;
  image_generated: unknown;
  generated_image_url: unknown;
  pattern_preparation_backend?: unknown;
  pattern_repair_prompt_kind?: unknown;
  pattern_repair_applied?: unknown;
  pattern_repair_reason_codes?: unknown;
  prep_tokens_charged?: unknown;
  detected_design: unknown;
  tokens_charged: unknown;
  tokens_refunded: unknown;
  text_latency_ms: unknown;
  image_latency_ms: unknown;
  total_latency_ms: unknown;
  error_type: unknown;
  error_message?: unknown;
  created_at: unknown;
};

function toRequestType(
  v: unknown,
): "analysis" | "prep" | "render_standard" | "render_high" | null {
  if (
    v === "analysis" ||
    v === "prep" ||
    v === "render_standard" ||
    v === "render_high"
  ) {
    return v;
  }
  return null;
}

function toPhase(v: unknown): "analysis" | "prep" | "render" | undefined {
  if (v === "analysis" || v === "prep" || v === "render") return v;
  return undefined;
}

function toQuality(v: unknown): "standard" | "high" | null {
  if (v === "standard" || v === "high") return v;
  return null;
}

function toAiModel(v: unknown): "openai" | "gemini" | "fal" {
  if (v === "openai" || v === "gemini" || v === "fal") return v;
  console.warn(`[toAiModel] Invalid ai_model value: ${String(v)}`);
  return "openai";
}

function toRequestAttachments(
  value: unknown,
): AdminGenerationLogItem["requestAttachments"] {
  if (!Array.isArray(value)) {
    return null;
  }

  const attachments = value
    .filter(isRecord)
    .map((attachment) => {
      const type = isAllowedAttachmentType(attachment.type)
        ? attachment.type
        : null;
      const label = toString(attachment.label);
      const attachmentValue = toString(attachment.value);
      const fileName =
        toString(attachment.fileName) ?? toString(attachment.file_name);

      if (!type || !label || !attachmentValue) {
        return null;
      }

      return {
        type,
        label,
        value: attachmentValue,
        ...(fileName ? { fileName } : {}),
      };
    })
    .filter(
      (
        attachment,
      ): attachment is NonNullable<
        AdminGenerationLogItem["requestAttachments"]
      >[number] => attachment !== null,
    );

  return attachments.length > 0 ? attachments : null;
}

export function toAdminGenerationLogItem(
  row: GenerationLogRow,
): AdminGenerationLogItem {
  const workflowId = toString(row.workflow_id);
  const phase = toPhase(row.phase);
  const parentWorkId = toString(row.parent_work_id);
  const normalizedDesign = isRecord(row.normalized_design)
    ? row.normalized_design
    : null;
  const eligibleForRender =
    typeof row.eligible_for_render === "boolean"
      ? row.eligible_for_render
      : null;
  const missingRequirements = Array.isArray(row.missing_requirements)
    ? row.missing_requirements
    : null;
  const eligibilityReason = toString(row.eligibility_reason);
  const textPrompt = toString(row.text_prompt);
  const imagePrompt = toString(row.image_prompt);
  const imageEditPrompt = toString(row.image_edit_prompt);
  const errorMessage = toString(row.error_message);
  const patternPreparationBackend =
    row.pattern_preparation_backend === "local" ||
    row.pattern_preparation_backend === "openai_repair"
      ? row.pattern_preparation_backend
      : null;
  const patternRepairPromptKind =
    row.pattern_repair_prompt_kind === "all_over_tile" ||
    row.pattern_repair_prompt_kind === "one_point_motif"
      ? row.pattern_repair_prompt_kind
      : null;
  const patternRepairApplied =
    typeof row.pattern_repair_applied === "boolean"
      ? row.pattern_repair_applied
      : null;
  const patternRepairReasonCodes = Array.isArray(
    row.pattern_repair_reason_codes,
  )
    ? row.pattern_repair_reason_codes.filter(
        (value): value is string => typeof value === "string",
      )
    : null;
  const prepTokensCharged =
    typeof row.prep_tokens_charged === "number"
      ? row.prep_tokens_charged
      : typeof row.prep_tokens_charged === "string"
        ? toNumber(row.prep_tokens_charged)
        : null;

  return {
    id: toString(row.id) ?? "",
    workId: toString(row.work_id) ?? "",
    userId: toString(row.user_id) ?? "",
    aiModel: toAiModel(row.ai_model),
    requestType: toRequestType(row.request_type),
    quality: toQuality(row.quality),
    userMessage: toString(row.user_message) ?? "",
    promptLength: toNumber(row.prompt_length),
    requestAttachments: toRequestAttachments(row.request_attachments),
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
    generatedImageUrl: toString(row.generated_image_url),
    ...(patternPreparationBackend ? { patternPreparationBackend } : {}),
    ...(patternRepairPromptKind ? { patternRepairPromptKind } : {}),
    ...(patternRepairApplied !== null ? { patternRepairApplied } : {}),
    ...(patternRepairReasonCodes ? { patternRepairReasonCodes } : {}),
    ...(prepTokensCharged !== null ? { prepTokensCharged } : {}),
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
    ...(workflowId ? { workflowId } : {}),
    ...(phase ? { phase } : {}),
    ...(parentWorkId !== null ? { parentWorkId } : {}),
    ...(normalizedDesign ? { normalizedDesign } : {}),
    ...(eligibleForRender !== null ? { eligibleForRender } : {}),
    ...(missingRequirements ? { missingRequirements } : {}),
    ...(eligibilityReason ? { eligibilityReason } : {}),
    ...(textPrompt ? { textPrompt } : {}),
    ...(imagePrompt ? { imagePrompt } : {}),
    ...(imageEditPrompt ? { imageEditPrompt } : {}),
    ...(errorMessage ? { errorMessage } : {}),
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
