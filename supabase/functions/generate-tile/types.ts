import type { AttachmentType } from "@/functions/_shared/request-attachments.ts";

export type FabricType = "yarn_dyed" | "printed";
export type PatternType = "all_over" | "one_point";
export type TileStructure =
  | "H"
  | "F"
  | "Q"
  | "STRIPE"
  | "DOT"
  | "TOSSED"
  | "MEDALLION"
  | "GEOMETRIC";
export type TileVariation =
  | "rotation"
  | "color"
  | "different_motif"
  | "stripe_classic_diagonal"
  | "stripe_multi_width"
  | "stripe_regimental"
  | "stripe_textured"
  | "stripe_dotted"
  | "dot_micro"
  | "dot_pin"
  | "tossed_scattered"
  | "medallion_classic"
  | "geometric_diamond"
  | "geometric_check"
  | "geometric_herringbone"
  | null;
export type EditTarget = "repeat" | "accent" | "both" | "new";
export type ObjectSource = "text" | "image" | "both";
export type ReferenceImageUsage =
  | "none"
  | "single_motif"
  | "composite_motif"
  | "multiple_motifs"
  | "repeat_and_accent";
export type { AttachmentType };

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
  referenceImageUsage: ReferenceImageUsage;
  tileLayout: TileLayout;
  accentLayout: AccentLayout | null;
}

export type MotifInterpretationAxis =
  | "iconographic"
  | "geometric_abstract"
  | "textural_abstract"
  | "symbolic_variation";

export type ColorEmphasis =
  | "balanced"
  | "dominant"
  | "monochrome"
  | "high_contrast";

export type CompositionDensity = "minimal" | "balanced" | "maximal";

export interface MotifInterpretation {
  axis: MotifInterpretationAxis;
  description: string;
  colorEmphasis: ColorEmphasis;
}

export interface StyleDirection {
  medium: string;
  aestheticVector: string;
  density: CompositionDensity;
}

export interface GenerationSpec {
  id: string;
  tileLayout: TileLayout;
  accentLayout: AccentLayout | null;
  motifInterpretation: MotifInterpretation;
  styleDirection: StyleDirection;
  referenceImageUsage: ReferenceImageUsage;
}

export interface CohesionAnchor {
  fabricType: FabricType;
  backgroundColor: string;
  motifKernel: string;
}

export interface DiversityPlan {
  baseAnalysis: AnalysisOutput;
  variants: GenerationSpec[];
  cohesionAnchor: CohesionAnchor;
}

export interface TileGenerationRequest {
  route: "tile_generation" | "tile_edit";
  userMessage: string;
  uiFabricType: FabricType | null;
  // Empty array means no colors selected.
  selectedColors: string[];
  previousFabricType: FabricType | null;
  previousRepeatTileUrl: string | null;
  previousRepeatTileWorkId: string | null;
  previousAccentTileUrl: string | null;
  previousAccentTileWorkId: string | null;
  previousAccentLayoutJson: AccentLayout | null;
  conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  attachedImageUrls: string[];
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
      type: AttachmentType;
      label: string;
      value: string;
      fileName?: string;
    }>;
    sequenceNumber: number;
  }>;
}

export interface TileGenerationResponse {
  generationId: string;
  prompt: string;
  patternType: PatternType;
  fabricType: FabricType;
  variants: Array<{
    id: string;
    index: number;
    repeatTileUrl: string;
    repeatTileWorkId: string;
    accentTileUrl: string | null;
    accentTileWorkId: string | null;
    accentLayout: AccentLayout | null;
  }>;
}
