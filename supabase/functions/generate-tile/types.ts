export type FabricType = "yarn_dyed" | "printed";
export type PatternType = "all_over" | "one_point";
export type TileStructure = "H" | "F" | "Q";
export type TileVariation = "rotation" | "color" | "different_motif" | null;
export type EditTarget = "repeat" | "accent" | "both" | "new";
export type ObjectSource = "text" | "image" | "both";

export interface Motif {
  name: string;
  color: string | null;
  colors: [string, string] | null;
}

export interface TileLayout {
  structure: TileStructure;
  variation: TileVariation;
  motifs: Motif[];
  backgroundColor: string;
}

export interface AccentLayout {
  objectDescription: string;
  objectSource: ObjectSource;
  color: string | null;
  size: "small" | "medium" | "large" | null;
}

export interface AnalysisOutput {
  intent: "new" | "edit";
  patternType: PatternType;
  editTarget: EditTarget;
  fabricTypeHint: FabricType | null;
  tileLayout: TileLayout;
  accentLayout: AccentLayout | null;
}

export interface TileGenerationRequest {
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
  allMessages: Array<{
    id: string;
    role: "user" | "ai";
    content: string;
    imageUrl: string | null;
    imageFileId: string | null;
    attachments?: Array<{
      type: "color" | "pattern" | "fabric" | "image" | "ci-placement";
      label: string;
      value: string;
      fileName?: string;
    }>;
    sequenceNumber: number;
  }>;
}

export interface TileGenerationResponse {
  repeatTileUrl: string;
  repeatTileWorkId: string;
  accentTileUrl: string | null;
  accentTileWorkId: string | null;
  patternType: PatternType;
  fabricType: FabricType;
  accentLayout: AccentLayout | null;
}
