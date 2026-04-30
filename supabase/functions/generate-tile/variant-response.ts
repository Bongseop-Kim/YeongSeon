import type { GeneratedTile } from "./image-generator.ts";
import type { AccentLayout, FabricType, PatternType } from "./types.ts";

interface BuildTileGenerationVariantResponseParams {
  generationId: string;
  prompt: string;
  patternType: PatternType;
  fabricType: FabricType;
  repeatResults: GeneratedTile[];
  accentResults: GeneratedTile[];
  accentLayouts: AccentLayout[];
}

interface TileGenerationVariantResponse {
  id: string;
  index: number;
  repeatTileUrl: string;
  repeatTileWorkId: string;
  accentTileUrl: string | null;
  accentTileWorkId: string | null;
  accentLayout: AccentLayout | null;
}

export function buildTileGenerationVariantResponse(
  params: BuildTileGenerationVariantResponseParams,
): {
  generationId: string;
  prompt: string;
  patternType: PatternType;
  fabricType: FabricType;
  variants: TileGenerationVariantResponse[];
} {
  if (params.repeatResults.length !== 4) {
    throw new Error("generation requires 4 repeat results");
  }

  if (params.patternType === "one_point" && params.accentResults.length !== 4) {
    throw new Error("one_point generation requires 4 accent results");
  }

  if (params.patternType === "all_over" && params.accentResults.length !== 0) {
    throw new Error("all_over generation must not include accent results");
  }
  if (params.patternType === "one_point" && params.accentLayouts.length !== 4) {
    throw new Error("one_point generation requires 4 accent layouts");
  }

  return {
    generationId: params.generationId,
    prompt: params.prompt,
    patternType: params.patternType,
    fabricType: params.fabricType,
    variants: params.repeatResults.map((repeatResult, index) => {
      const accentResult = params.accentResults[index] ?? null;

      return {
        id: crypto.randomUUID(),
        index: index + 1,
        repeatTileUrl: repeatResult.url,
        repeatTileWorkId: repeatResult.workId,
        accentTileUrl: accentResult?.url ?? null,
        accentTileWorkId: accentResult?.workId ?? null,
        accentLayout: accentResult ? params.accentLayouts[index] : null,
      };
    }),
  };
}
