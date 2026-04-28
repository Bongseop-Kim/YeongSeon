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

export interface TileGenerationResult {
  repeatTile: TileRef;
  accentTile: TileRef | null;
  patternType: PatternType;
  fabricType: FabricType;
  accentLayout: AccentLayout | null;
}
