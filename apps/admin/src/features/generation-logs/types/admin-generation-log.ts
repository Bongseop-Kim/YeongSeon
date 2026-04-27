export type GenerationLogPhase = "render";
export type GenerationRequestTypeFilter = "render_standard";
export type GenerationStatusFilter = "success" | "error";

export interface AdminGenerationLogItem {
  id: string;
  workflowId?: string;
  phase?: GenerationLogPhase;
  workId: string;
  parentWorkId?: string | null;
  userId: string;
  aiModel: "openai";
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
  imagePrompt?: string | null;
  route: "openai" | "tile_generation" | "tile_edit" | null;
  imageGenerated: boolean;
  generatedImageUrl: string | null;
  repeatTileUrl: string | null;
  repeatTileWorkId: string | null;
  accentTileUrl: string | null;
  accentTileWorkId: string | null;
  patternType: "all_over" | "one_point" | null;
  fabricType: "yarn_dyed" | "printed" | null;
  tileRole: "repeat" | "accent" | null;
  pairedTileWorkId: string | null;
  accentLayoutJson: Record<string, unknown> | null;
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
