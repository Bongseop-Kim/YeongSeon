import type { Attachment } from "@/entities/design/model/ai-design-types";
import type { DesignContext } from "@/entities/design/model/design-context";
import type {
  AccentLayout,
  FabricType,
  PatternType,
  TileRef,
} from "@/entities/design/model/tile-types";

export interface DesignGenerationRequestMetadata {
  selectedColors: string[];
  attachments: Attachment[];
  route: "tile_generation" | "tile_edit";
  sourceGenerationId?: string | null;
  sourceVariantId?: string | null;
  designContext?: Partial<DesignContext>;
}

export interface DesignGenerationVariant {
  id: string;
  generationId: string;
  index: 1 | 2 | 3 | 4;
  repeatTile: TileRef;
  accentTile: TileRef | null;
  accentLayout: AccentLayout | null;
  patternType: PatternType;
  fabricType: FabricType;
  createdAt: string;
}

export interface DesignGeneration {
  id: string;
  userId: string;
  prompt: string;
  patternType: PatternType;
  fabricType: FabricType;
  requestMetadata: DesignGenerationRequestMetadata;
  variants: DesignGenerationVariant[];
  createdAt: string;
  updatedAt: string;
}
