import type {
  AdminGenerationLogItem,
  ErrorDistribution,
  GenerationLogPhase,
  GenerationStatsData,
  GenerationSummaryStats,
  InputTypeStats,
  ModelStats,
  PatternStats,
} from "@/features/generation-logs/types/admin-generation-log";
import { isRecord } from "@/utils/type-guards";

export const isSafeInteger = (n: number): boolean => Number.isSafeInteger(n);
const isSafeFinite = (n: number): boolean =>
  Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER;

export function parseNumberWith(
  v: unknown,
  isAcceptable: (n: number) => boolean,
): number | null {
  if (typeof v === "bigint") {
    const n = Number(v);
    return isAcceptable(n) ? n : null;
  }
  if (typeof v === "number") {
    return isAcceptable(v) ? v : null;
  }
  if (typeof v === "string") {
    const n = Number(v);
    return isAcceptable(n) ? n : null;
  }
  return null;
}

function toNumber(v: unknown, fallback = 0): number {
  return parseNumberWith(v, isSafeInteger) ?? fallback;
}

function toStatsNumber(v: unknown, fallback = 0): number {
  return parseNumberWith(v, isSafeFinite) ?? fallback;
}

function toString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function toBoolean(v: unknown): boolean {
  return v === true;
}

function toNullableString(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}

function toDesignScale(
  v: unknown,
): NonNullable<AdminGenerationLogItem["designContext"]>["scale"] | undefined {
  if (v === null) return null;
  if (v === "large" || v === "medium" || v === "small") return v;
  return undefined;
}

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
  image_prompt?: unknown;
  route?: unknown;
  image_generated: unknown;
  generated_image_url: unknown;
  repeat_tile_url?: unknown;
  repeat_tile_work_id?: unknown;
  accent_tile_url?: unknown;
  accent_tile_work_id?: unknown;
  pattern_type?: unknown;
  fabric_type?: unknown;
  tile_role?: unknown;
  paired_tile_work_id?: unknown;
  accent_layout_json?: unknown;
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

function toRequestType(v: unknown): "render_standard" | null {
  if (v === "render_standard") {
    return v;
  }
  return null;
}

function toPhase(v: unknown): GenerationLogPhase | undefined {
  if (v === "render") return v;
  return undefined;
}

function toQuality(v: unknown): "standard" | null {
  if (v === "standard") return v;
  return null;
}

function toRoute(v: unknown): AdminGenerationLogItem["route"] {
  if (v === "openai" || v === "tile_generation" || v === "tile_edit") {
    return v;
  }
  return null;
}

function toPatternType(v: unknown): AdminGenerationLogItem["patternType"] {
  if (v === "all_over" || v === "one_point") {
    return v;
  }
  return null;
}

function toFabricType(v: unknown): AdminGenerationLogItem["fabricType"] {
  if (v === "yarn_dyed" || v === "printed") {
    return v;
  }
  return null;
}

function toTileRole(v: unknown): AdminGenerationLogItem["tileRole"] {
  if (v === "repeat" || v === "accent") {
    return v;
  }
  return null;
}

function toAiModel(v: unknown): "openai" {
  if (v === "openai") return v;
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

function toDesignContext(
  value: unknown,
): AdminGenerationLogItem["designContext"] {
  if (!isRecord(value)) {
    return null;
  }

  const colors = Array.isArray(value.colors)
    ? value.colors.filter((color): color is string => typeof color === "string")
    : undefined;
  const pattern = toNullableString(value.pattern);
  const fabricMethod = toNullableString(value.fabricMethod);
  const ciPlacement = toNullableString(value.ciPlacement);
  const scale = toDesignScale(value.scale);

  const designContext: NonNullable<AdminGenerationLogItem["designContext"]> =
    {};

  if (colors && colors.length > 0) {
    designContext.colors = colors;
  }
  if (pattern !== undefined) {
    designContext.pattern = pattern;
  }
  if (fabricMethod !== undefined) {
    designContext.fabricMethod = fabricMethod;
  }
  if (ciPlacement !== undefined) {
    designContext.ciPlacement = ciPlacement;
  }
  if (scale !== undefined) {
    designContext.scale = scale;
  }

  return Object.keys(designContext).length > 0 ? designContext : null;
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
  const imagePrompt = toString(row.image_prompt);
  const errorMessage = toString(row.error_message);

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
    designContext: toDesignContext(row.design_context),
    conversationTurn: toNumber(row.conversation_turn),
    hasCiImage: toBoolean(row.has_ci_image),
    hasReferenceImage: toBoolean(row.has_reference_image),
    hasPreviousImage: toBoolean(row.has_previous_image),
    aiMessage: toString(row.ai_message),
    generateImage:
      typeof row.generate_image === "boolean" ? row.generate_image : null,
    route: toRoute(row.route),
    imageGenerated: toBoolean(row.image_generated),
    generatedImageUrl: toString(row.generated_image_url),
    repeatTileUrl: toString(row.repeat_tile_url),
    repeatTileWorkId: toString(row.repeat_tile_work_id),
    accentTileUrl: toString(row.accent_tile_url),
    accentTileWorkId: toString(row.accent_tile_work_id),
    patternType: toPatternType(row.pattern_type),
    fabricType: toFabricType(row.fabric_type),
    tileRole: toTileRole(row.tile_role),
    pairedTileWorkId: toString(row.paired_tile_work_id),
    // TODO: If accentLayoutJson is reused outside admin display or sent via RPC,
    // replace this loose record check with validateAccentLayout/parseAccentLayout
    // to enforce objectDescription, objectSource, and value types.
    accentLayoutJson: isRecord(row.accent_layout_json)
      ? row.accent_layout_json
      : null,
    detectedDesign: isRecord(row.detected_design) ? row.detected_design : null,
    tokensCharged: toNumber(row.tokens_charged),
    tokensRefunded: toNumber(row.tokens_refunded),
    textLatencyMs: parseNumberWith(row.text_latency_ms, isSafeInteger),
    imageLatencyMs: parseNumberWith(row.image_latency_ms, isSafeInteger),
    totalLatencyMs: parseNumberWith(row.total_latency_ms, isSafeInteger),
    errorType: toString(row.error_type),
    createdAt: toString(row.created_at) ?? "",
    ...(workflowId ? { workflowId } : {}),
    ...(phase ? { phase } : {}),
    ...(parentWorkId !== null ? { parentWorkId } : {}),
    ...(normalizedDesign ? { normalizedDesign } : {}),
    ...(imagePrompt ? { imagePrompt } : {}),
    ...(errorMessage ? { errorMessage } : {}),
  };
}

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
    totalRequests: toStatsNumber(summary.total_requests),
    imageSuccessRate: toStatsNumber(summary.image_success_rate),
    totalTokensConsumed: toStatsNumber(summary.total_tokens_consumed),
    avgTotalLatencyMs: toStatsNumber(summary.avg_total_latency_ms),
  };

  const byModel: ModelStats[] = Array.isArray(raw.by_model)
    ? raw.by_model.filter(isRecord).map((m) => ({
        aiModel: toString(m.ai_model) ?? "",
        requestCount: toStatsNumber(m.request_count),
        avgTextLatencyMs: toStatsNumber(m.avg_text_latency_ms),
        avgImageLatencyMs: toStatsNumber(m.avg_image_latency_ms),
        avgTokenCost: toStatsNumber(m.avg_token_cost),
        imageSuccessRate: toStatsNumber(m.image_success_rate),
      }))
    : [];

  const byInputType: InputTypeStats[] = Array.isArray(raw.by_input_type)
    ? raw.by_input_type.filter(isRecord).map((it) => ({
        inputType: toString(it.input_type) ?? "",
        requestCount: toStatsNumber(it.request_count),
        imageSuccessRate: toStatsNumber(it.image_success_rate),
        avgLatencyMs: toStatsNumber(it.avg_latency_ms),
        avgTokenCost: toStatsNumber(it.avg_token_cost),
      }))
    : [];

  const byPattern: PatternStats[] = Array.isArray(raw.by_pattern)
    ? raw.by_pattern.filter(isRecord).map((p) => ({
        pattern: toString(p.pattern) ?? "(미지정)",
        requestCount: toStatsNumber(p.request_count),
        imageSuccessRate: toStatsNumber(p.image_success_rate),
        avgTokenCost: toStatsNumber(p.avg_token_cost),
      }))
    : [];

  const byError: ErrorDistribution[] = Array.isArray(raw.by_error)
    ? raw.by_error.filter(isRecord).map((e) => ({
        errorType: toString(e.error_type) ?? "성공",
        count: toStatsNumber(e.count),
      }))
    : [];

  return { summary: parsedSummary, byModel, byInputType, byPattern, byError };
}
