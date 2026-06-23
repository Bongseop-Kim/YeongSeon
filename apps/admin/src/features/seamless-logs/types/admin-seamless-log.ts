export type SeamlessInputTypeFilter = "intent" | "prompt" | "reference_image";
export type SeamlessStatusFilter = "success" | "partial" | "error";

export interface AdminSeamlessLogCandidate {
  id: string | null;
  layoutId: string | null;
  sourceFidelity: string | null;
  colorwayId: string | null;
  seed: number | null;
  pngUrl: string | null;
  // svg 는 목록 조회에는 포함되지 않고 단건 상세에서만 채워진다.
  svg: string | null;
}

export interface AdminSeamlessLogItem {
  id: string;
  requestId: string | null;
  inputType: SeamlessInputTypeFilter | null;
  prompt: string | null;
  hasReferenceImage: boolean;
  referenceImageBytes: number | null;
  colorway: string | null;
  seed: number | null;
  candidateCountRequested: number | null;
  candidateCountReturned: number | null;
  distinctLayouts: number | null;
  availableStrategies: number | null;
  engineVersion: string | null;
  registryVersion: string | null;
  // intent 는 목록 조회에는 포함되지 않고 단건 상세에서만 채워진다.
  intent: Record<string, unknown> | null;
  candidates: AdminSeamlessLogCandidate[];
  warnings: string[];
  generateMs: number | null;
  renderMs: number | null;
  status: SeamlessStatusFilter | null;
  errorType: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface SeamlessSummaryStats {
  total: number;
  successCount: number;
  partialCount: number;
  errorCount: number;
  avgGenerateMs: number;
  avgRenderMs: number;
}

export interface SeamlessInputTypeStats {
  inputType: string;
  count: number;
}

export interface SeamlessStatusStats {
  status: string;
  count: number;
}

export interface SeamlessStatsData {
  summary: SeamlessSummaryStats;
  byInputType: SeamlessInputTypeStats[];
  byStatus: SeamlessStatusStats[];
}
