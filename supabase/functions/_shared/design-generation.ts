import type { SupabaseClient } from "@supabase/supabase-js";
import type { GenerateDesignRequest } from "@/functions/_shared/design-request.ts";
import type { DetectedDesign } from "@/functions/_shared/conversation.ts";

export type ContextChip = {
  label: string;
  action: string;
};

export const isContextChip = (value: unknown): value is ContextChip =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { label?: unknown }).label === "string" &&
  typeof (value as { action?: unknown }).action === "string";

export type GenerateDesignResult = {
  aiMessage: string;
  contextChips: ContextChip[];
  imageUrl: string | null;
  workId: string;
  workflowId: string;
  analysisWorkId: string;
  route?:
    | "openai"
    | "fal_tiling"
    | "fal_edit"
    | "fal_controlnet"
    | "fal_inpaint";
  routeSignals?: string[];
  routeReason?: string | null;
  falRequestId?: string | null;
  seed?: number | null;
  generateImage: boolean;
  eligibleForRender: boolean;
  missingRequirements: string[];
  remainingTokens: number | null;
};

export type GenerationRequestType =
  | "analysis"
  | "render_standard"
  | "render_high";
export type ImageQuality = "standard" | "high";
export type ExecutionMode = "auto" | "analysis_only" | "render_from_analysis";
export type UseDesignTokensResult = {
  success: boolean;
  error?: string;
  balance: number;
  cost: number;
};

export type NormalizedDesignContext = {
  colors: string[];
  pattern: string | null;
  fabricMethod: string | null;
  ciPlacement: string | null;
  scale: "large" | "medium" | "small" | null;
};

export type TextAnalysisResult = {
  aiMessage: string;
  contextChips: ContextChip[];
  generateImage: boolean;
  detectedDesign: DetectedDesign | null;
};

export type AnalysisResult = {
  workflowId: string;
  analysisWorkId: string;
  userMessage: string;
  aiMessage: string;
  contextChips: ContextChip[];
  generateImage: boolean;
  eligibleForRender: boolean;
  missingRequirements: string[];
  eligibilityReason: string;
  conversationTurn: number;
  designContext: Record<string, unknown> | null;
  normalizedDesign: NormalizedDesignContext;
  detectedDesign: Record<string, unknown> | null;
  textPrompt: string;
  imagePrompt: string;
  imageEditPrompt: string;
  renderPayload: GenerateDesignRequest;
  hasCiImage: boolean;
  hasReferenceImage: boolean;
  hasPreviousImage: boolean;
  tokensCharged: number;
  tokensRefunded: number;
  textLatencyMs: number | null;
  remainingTokens: number | null;
};

export type AnalysisSnapshot = Omit<
  AnalysisResult,
  | "contextChips"
  | "renderPayload"
  | "tokensCharged"
  | "tokensRefunded"
  | "textLatencyMs"
  | "remainingTokens"
  | "imagePrompt"
  | "imageEditPrompt"
> & {
  imagePrompt: string | null;
  imageEditPrompt: string | null;
};

export type AnalysisSnapshotRow = {
  workflow_id: string | null;
  work_id: string | null;
  user_message: string | null;
  ai_message: string | null;
  generate_image: boolean | null;
  eligible_for_render: boolean | null;
  missing_requirements: unknown;
  eligibility_reason: string | null;
  conversation_turn: number | null;
  design_context: unknown;
  normalized_design: unknown;
  detected_design: unknown;
  text_prompt: string | null;
  image_prompt: string | null;
  image_edit_prompt: string | null;
  has_ci_image: boolean | null;
  has_reference_image: boolean | null;
  has_previous_image: boolean | null;
};

export type RenderResult = {
  renderWorkId: string;
  imageUrl: string | null;
  imagekitUrl: string | null;
  imagekitFileId: string | null;
  remainingTokens: number | null;
  quality: ImageQuality;
  requestType: GenerationRequestType;
  tokensCharged: number;
  tokensRefunded: number;
  imageLatencyMs: number | null;
  errorType: string | null;
  errorMessage: string | null;
};

export type LogContext = {
  workId: string;
  workflowId: string;
  phase: "analysis" | "render";
  parentWorkId?: string | null;
  requestType: GenerationRequestType;
  quality: ImageQuality | null;
  userId: string;
  userMessage: string;
  promptLength: number;
  requestAttachments?: Array<{
    type: "color" | "pattern" | "fabric" | "image" | "ci-placement";
    label: string;
    value: string;
    fileName?: string;
  }> | null;
  conversationTurn: number;
  designContext: Record<string, unknown> | null;
  normalizedDesign?: Record<string, unknown> | null;
  hasCiImage: boolean;
  hasReferenceImage: boolean;
  hasPreviousImage: boolean;
  detectedDesign?: Record<string, unknown> | null;
  aiMessage?: string | null;
  generateImage?: boolean | null;
  eligibleForRender?: boolean | null;
  missingRequirements?: string[] | null;
  eligibilityReason?: string | null;
  textPrompt?: string | null;
  imagePrompt?: string | null;
  imageEditPrompt?: string | null;
  route?:
    | "openai"
    | "fal_tiling"
    | "fal_edit"
    | "fal_controlnet"
    | "fal_inpaint"
    | null;
  routeReason?: string | null;
  routeSignals?: string[] | null;
  baseImageWorkId?: string | null;
  falRequestId?: string | null;
  seed?: number | null;
  imageGenerated?: boolean;
  generatedImageUrl?: string | null;
  tokensCharged?: number;
  tokensRefunded?: number;
  textLatencyMs?: number | null;
  imageLatencyMs?: number | null;
  totalLatencyMs?: number | null;
  errorType?: string | null;
  errorMessage?: string | null;
};

export class HttpError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === "string" ? body.error : "Request failed");
    this.status = status;
    this.body = body;
  }
}

export const MAX_HISTORY_TURNS = 20;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_IMAGE_BASE64_LENGTH = 5_000_000;
export const ANALYSIS_REQUEST_TYPE: GenerationRequestType = "analysis";
export const ANALYSIS_QUALITY: ImageQuality = "standard";

export const toRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export const normalizeScale = (
  value: unknown,
): NormalizedDesignContext["scale"] =>
  value === "large" || value === "medium" || value === "small" ? value : null;

export const normalizePositionIntent = (
  value: unknown,
): DetectedDesign["positionIntent"] =>
  value === "move-left" ||
  value === "move-right" ||
  value === "move-up" ||
  value === "move-down"
    ? value
    : null;

export const normalizeDetectedDesign = (
  value: unknown,
): DetectedDesign | null => {
  const record = toRecord(value);
  if (!record) {
    return null;
  }

  return {
    pattern: typeof record.pattern === "string" ? record.pattern : null,
    colors: normalizeStringArray(record.colors),
    ciPlacement:
      typeof record.ciPlacement === "string" ? record.ciPlacement : null,
    scale: normalizeScale(record.scale),
    positionIntent: normalizePositionIntent(record.positionIntent),
  };
};

export const normalizeDesignContext = (
  value: unknown,
): NormalizedDesignContext => {
  const record = toRecord(value);

  return {
    colors: normalizeStringArray(record?.colors),
    pattern: typeof record?.pattern === "string" ? record.pattern : null,
    fabricMethod:
      typeof record?.fabricMethod === "string" ? record.fabricMethod : null,
    ciPlacement:
      typeof record?.ciPlacement === "string" ? record.ciPlacement : null,
    scale: normalizeScale(record?.scale),
  };
};

export const mergeDetectedDesign = (
  payload: GenerateDesignRequest,
  detectedDesign: DetectedDesign | null,
): NormalizedDesignContext => {
  const payloadColors = normalizeStringArray(payload.designContext?.colors);
  const detectedColors = detectedDesign?.colors ?? [];

  return {
    colors: payloadColors.length > 0 ? payloadColors : detectedColors,
    pattern: payload.designContext?.pattern ?? detectedDesign?.pattern ?? null,
    fabricMethod: payload.designContext?.fabricMethod ?? null,
    ciPlacement:
      payload.designContext?.ciPlacement ?? detectedDesign?.ciPlacement ?? null,
    scale: payload.designContext?.scale ?? detectedDesign?.scale ?? null,
  };
};

export const getExecutionMode = (
  payload: GenerateDesignRequest,
): ExecutionMode =>
  payload.executionMode ??
  (payload.autoGenerate === false ? "analysis_only" : "auto");

export const getImageQuality = (
  payload: GenerateDesignRequest,
): ImageQuality =>
  payload.ciImageBase64 ||
  payload.referenceImageBase64 ||
  payload.designContext?.ciPlacement
    ? "high"
    : "standard";

export const determineEligibility = (
  payload: GenerateDesignRequest,
  normalizedDesign: NormalizedDesignContext,
  generateImage: boolean,
): {
  eligibleForRender: boolean;
  missingRequirements: string[];
  eligibilityReason: string;
} => {
  if (!generateImage) {
    return {
      eligibleForRender: false,
      missingRequirements: [],
      eligibilityReason: "generate_image_false",
    };
  }

  const missingRequirements: string[] = [];

  if (!normalizedDesign.fabricMethod) {
    missingRequirements.push("fabricMethod");
  }

  const hasVisualDirection =
    Boolean(normalizedDesign.pattern) ||
    normalizedDesign.colors.length > 0 ||
    Boolean(normalizedDesign.ciPlacement) ||
    Boolean(payload.ciImageBase64) ||
    Boolean(payload.referenceImageBase64) ||
    Boolean(payload.previousImageBase64);

  if (!hasVisualDirection) {
    missingRequirements.push("pattern");
  }

  return {
    eligibleForRender: missingRequirements.length === 0,
    missingRequirements,
    eligibilityReason:
      missingRequirements.length === 0 ? "ready" : "missing_requirements",
  };
};

const ANALYSIS_SNAPSHOT_COLUMNS =
  "workflow_id, work_id, user_message, ai_message, generate_image, eligible_for_render, missing_requirements, eligibility_reason, conversation_turn, design_context, normalized_design, detected_design, text_prompt, image_prompt, image_edit_prompt, has_ci_image, has_reference_image, has_previous_image";

export const loadAnalysisSnapshot = async (
  adminClient: SupabaseClient,
  userId: string,
  analysisWorkId: string,
): Promise<AnalysisSnapshot> => {
  const { data, error } = await adminClient
    .from("ai_generation_logs")
    .select(ANALYSIS_SNAPSHOT_COLUMNS)
    .eq("user_id", userId)
    .eq("phase", "analysis")
    .eq("work_id", analysisWorkId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load analysis snapshot:", error);
    throw new HttpError(500, { error: "Failed to load analysis snapshot" });
  }

  if (!data) {
    throw new HttpError(404, { error: "analysis_not_found" });
  }

  const row = data as unknown as AnalysisSnapshotRow;
  const workflowId =
    typeof row.workflow_id === "string" ? row.workflow_id : null;
  const workId = typeof row.work_id === "string" ? row.work_id : null;
  const textPrompt =
    typeof row.text_prompt === "string" ? row.text_prompt : null;
  const imagePrompt =
    typeof row.image_prompt === "string" ? row.image_prompt : null;
  const imageEditPrompt =
    typeof row.image_edit_prompt === "string" ? row.image_edit_prompt : null;

  if (!workflowId || !workId || !textPrompt) {
    throw new HttpError(409, { error: "analysis_snapshot_incomplete" });
  }

  return {
    workflowId,
    analysisWorkId: workId,
    userMessage: typeof row.user_message === "string" ? row.user_message : "",
    aiMessage: typeof row.ai_message === "string" ? row.ai_message : "",
    generateImage: row.generate_image === true,
    eligibleForRender: row.eligible_for_render === true,
    missingRequirements: normalizeStringArray(row.missing_requirements),
    eligibilityReason:
      typeof row.eligibility_reason === "string"
        ? row.eligibility_reason
        : "snapshot_loaded",
    conversationTurn:
      typeof row.conversation_turn === "number" ? row.conversation_turn : 0,
    designContext: toRecord(row.design_context) ?? null,
    normalizedDesign: normalizeDesignContext(row.normalized_design),
    detectedDesign: toRecord(row.detected_design) ?? null,
    textPrompt,
    imagePrompt,
    imageEditPrompt,
    hasCiImage: row.has_ci_image === true,
    hasReferenceImage: row.has_reference_image === true,
    hasPreviousImage: row.has_previous_image === true,
  };
};
