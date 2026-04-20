import type { ConversationTurn } from "./conversation.ts";

export type FalGenerationRoute = "fal_tiling" | "fal_edit";

export type BackgroundPattern =
  | { type: "solid"; color: string }
  | { type: "stripe"; width: number; colors: [string, string] }
  | { type: "check"; cellSize: number; colors: [string, string] }
  | {
      type: "dot";
      dotSize: number;
      spacing: number;
      color: string;
      background: string;
    };

interface RequestSessionAttachment {
  type: "color" | "pattern" | "fabric" | "image" | "ci-placement";
  label: string;
  value: string;
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
  designContext?: {
    colors?: string[];
    pattern?: string | null;
    fabricMethod?: string | null;
    ciPlacement?: string | null;
    scale?: "large" | "medium" | "small" | null;
    backgroundPattern?: BackgroundPattern | null;
  };
  autoGenerate?: boolean;
  analysisWorkId?: string | null;
  executionMode?: "auto" | "analysis_only" | "render_from_analysis";
  conversationHistory?: ConversationTurn[];
  previousImageBase64?: string;
  previousImageMimeType?: string;
  ciImageBase64?: string;
  ciImageMimeType?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  tiledBase64?: string;
  tiledMimeType?: string;
  route?: FalGenerationRoute;
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
