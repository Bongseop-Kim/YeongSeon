export interface AdminGenerationLogItem {
  id: string;
  workId: string;
  userId: string;
  aiModel: "openai" | "gemini";
  requestType: "text_only" | "text_and_image" | null;
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
  conversationTurn: number;
  hasCiImage: boolean;
  hasReferenceImage: boolean;
  hasPreviousImage: boolean;
  aiMessage: string | null;
  generateImage: boolean | null;
  imageGenerated: boolean;
  detectedDesign: Record<string, unknown> | null;
  tokensCharged: number;
  tokensRefunded: number;
  textLatencyMs: number | null;
  imageLatencyMs: number | null;
  totalLatencyMs: number | null;
  errorType: string | null;
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
