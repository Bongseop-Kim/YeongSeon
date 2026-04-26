import type { SessionMessagePayload } from "@/entities/design/model/ai-design-request";

export type PatternType = "all_over" | "one_point";
export type FabricType = "yarn_dyed" | "printed";
export type TileRef = { url: string; workId: string };

export interface AccentLayout {
  objectDescription: string;
  objectSource: "text" | "image" | "both";
  color: string | null;
  size: "small" | "medium" | "large" | null;
}

export interface TileGenerationPayload {
  route: "tile_generation" | "tile_edit";
  userMessage: string;
  uiFabricType: FabricType | null;
  previousFabricType: FabricType | null;
  previousRepeatTileUrl: string | null;
  previousRepeatTileWorkId: string | null;
  previousAccentTileUrl: string | null;
  previousAccentTileWorkId: string | null;
  previousAccentLayoutJson: AccentLayout | null;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  attachedImageUrl: string | null;
  sessionId: string;
  workflowId: string;
  firstMessage: string;
  allMessages: SessionMessagePayload[];
}

export interface TileGenerationResult {
  repeatTileUrl: string;
  repeatTileWorkId: string;
  accentTileUrl: string | null;
  accentTileWorkId: string | null;
  patternType: PatternType;
  fabricType: FabricType;
  accentLayout: AccentLayout | null;
}
