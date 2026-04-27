export type GenerationLogPhase = "analysis" | "prep" | "render";
export type GenerationRequestTypeFilter =
  | "analysis"
  | "prep"
  | "render_standard"
  | "render_high";
export type GenerationStatusFilter = "success" | "error";

export interface AdminGenerationLogItem {
  id: string;
  workflowId?: string;
  phase?: GenerationLogPhase;
  workId: string;
  parentWorkId?: string | null;
  userId: string;
  aiModel: "openai" | "fal";
  requestType: GenerationRequestTypeFilter | null;
  quality: "standard" | "high" | null;
  userMessage: string;
  promptLength: number;
  designContext: {
    colors?: string[];
    pattern?: string | null;
    fabricMethod?: string | null;
    ciPlacement?: string | null;
    scale?: "large" | "medium" | "small" | null;
  } | null;
  normalizedDesign?: Record<string, unknown> | null;
  conversationTurn: number;
  hasCiImage: boolean;
  hasReferenceImage: boolean;
  hasPreviousImage: boolean;
  aiMessage: string | null;
  generateImage: boolean | null;
  eligibleForRender?: boolean | null;
  missingRequirements?: unknown[] | null;
  eligibilityReason?: string | null;
  textPrompt?: string | null;
  imagePrompt?: string | null;
  imageEditPrompt?: string | null;
  imageGenerated: boolean;
  generatedImageUrl: string | null;
  patternPreparationBackend?: "local" | "openai_repair" | null;
  patternRepairPromptKind?: "all_over_tile" | "one_point_motif" | null;
  patternRepairApplied?: boolean | null;
  patternRepairReasonCodes?: string[] | null;
  prepTokensCharged?: number | null;
  requestAttachments: Array<{
    type: "color" | "pattern" | "fabric" | "image" | "ci-placement";
    label: string;
    value: string;
    fileName?: string;
  }> | null;
  detectedDesign: Record<string, unknown> | null;
  tokensCharged: number;
  tokensRefunded: number;
  textLatencyMs: number | null;
  imageLatencyMs: number | null;
  totalLatencyMs: number | null;
  errorType: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface GenerationSummaryStats {
  totalRequests: number;
  imageSuccessRate: number;
  totalTokensConsumed: number;
  avgTotalLatencyMs: number;
}

export interface ModelStats {
  aiModel: string;
  requestCount: number;
  avgTextLatencyMs: number;
  avgImageLatencyMs: number;
  avgTokenCost: number;
  imageSuccessRate: number;
}

export interface InputTypeStats {
  inputType: string;
  requestCount: number;
  imageSuccessRate: number;
  avgLatencyMs: number;
  avgTokenCost: number;
}

export interface PatternStats {
  pattern: string;
  requestCount: number;
  imageSuccessRate: number;
  avgTokenCost: number;
}

export interface ErrorDistribution {
  errorType: string;
  count: number;
}

export interface GenerationStatsData {
  summary: GenerationSummaryStats;
  byModel: ModelStats[];
  byInputType: InputTypeStats[];
  byPattern: PatternStats[];
  byError: ErrorDistribution[];
}
