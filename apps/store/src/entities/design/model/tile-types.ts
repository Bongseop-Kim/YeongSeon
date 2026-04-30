import type { Attachment } from "@/entities/design/model/ai-design-types";

export type PatternType = "all_over" | "one_point";
export type FabricType = "yarn_dyed" | "printed";
export type TileRef = { url: string; workId: string };

export interface AccentLayout {
  objectDescription: string;
  objectSource: "text" | "image" | "both";
  color: string | null;
  size: "small" | "medium" | "large" | null;
}

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export interface SessionMessagePayload {
  id: string;
  role: "user" | "ai";
  content: string;
  imageUrl: string | null;
  imageFileId: string | null;
  attachments?: Attachment[];
  sequenceNumber: number;
}

export interface TileGenerationPayload {
  route: "tile_generation" | "tile_edit";
  userMessage: string;
  uiFabricType: FabricType | null;
  selectedColors: string[];
  previousFabricType: FabricType | null;
  previousRepeatTile: TileRef | null;
  previousAccentTile: TileRef | null;
  previousAccentLayoutJson: AccentLayout | null;
  conversationHistory: ConversationTurn[];
  attachedImageUrls: string[];
  sessionId: string;
  workflowId: string;
  firstMessage: string;
  allMessages: SessionMessagePayload[];
}

export interface TileGenerationVariantResult {
  id: string;
  index: 1 | 2 | 3 | 4;
  repeatTile: TileRef;
  accentTile: TileRef | null;
  accentLayout: AccentLayout | null;
}

export interface TileGenerationResult {
  generationId: string;
  prompt: string;
  variants: TileGenerationVariantResult[];
  // Transitional fields used by the existing preview/chat flow until the feed
  // UI becomes the only consumer.
  repeatTile: TileRef;
  accentTile: TileRef | null;
  patternType: PatternType;
  fabricType: FabricType;
  accentLayout: AccentLayout | null;
}
