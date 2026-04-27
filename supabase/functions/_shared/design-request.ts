import type { ConversationTurn } from "./conversation.ts";
import type { AttachmentType } from "./request-attachments.ts";
export type { BackgroundPattern } from "@/packages/shared/src/types/design/background-pattern.ts";
import type { BackgroundPattern } from "@/packages/shared/src/types/design/background-pattern.ts";

export type FalGenerationRoute =
  | "fal_tiling"
  | "fal_edit"
  | "fal_controlnet"
  | "fal_inpaint"
  | "tile_generation"
  | "tile_edit";

interface RequestSessionAttachment {
  type: AttachmentType;
  label: string;
  value: string;
  fileName?: string;
}

export interface RequestSessionMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  imageUrl: string | null;
  imageFileId: string | null;
  attachments?: RequestSessionAttachment[];
  sequenceNumber: number;
}

export type GenerateDesignRequest = {
  userMessage: string;
  attachments?: RequestSessionAttachment[];
  designContext?: {
    colors?: string[];
    pattern?: string | null;
    fabricMethod?: string | null;
    ciPlacement?: string | null;
    scale?: "large" | "medium" | "small" | null;
    backgroundPattern?: BackgroundPattern;
  };
  workflowId?: string | null;
  prepWorkId?: string | null;
  analysisWorkId?: string | null;
  executionMode?: "auto" | "render_from_analysis";
  autoGenerate?: boolean;
  conversationHistory?: ConversationTurn[];
  previousImageBase64?: string;
  previousImageMimeType?: string;
  sourceImageBase64?: string;
  sourceImageMimeType?: string;
  ciImageBase64?: string;
  ciImageMimeType?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  tiledBase64?: string;
  tiledMimeType?: string;
  patternPreparation?: {
    placementMode: "all-over" | "one-point";
    sourceStatus: "ready" | "repair_required";
    fabricStatus: "ready" | "repair_required";
    reasonCodes: string[];
    preparedSourceKind: "original" | "repaired";
    preparationBackend?: "local" | "openai_repair";
    repairApplied?: boolean;
    repairPromptKind?: "all_over_tile" | "one_point_motif" | null;
    repairSummary?: string | null;
    prepTokensCharged?: number | null;
  };
  route?: FalGenerationRoute;
  controlType?: "lineart" | "edge" | "depth";
  structureImageBase64?: string;
  structureImageMimeType?: string;
  baseImageBase64?: string;
  baseImageMimeType?: string;
  maskBase64?: string;
  maskMimeType?: string;
  editPrompt?: string;
  routeSignals?: string[];
  routeReason?: string | null;
  routeHint?: "openai" | "fal_tiling" | "fal_edit";
  baseImageUrl?: string | null;
  baseImageWorkId?: string | null;
  seed?: number | null;
  sessionId?: string;
  firstMessage?: string;
  allMessages?: RequestSessionMessage[];
};
