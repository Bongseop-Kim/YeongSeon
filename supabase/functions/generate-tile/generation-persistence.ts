import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { AccentLayout, FabricType, PatternType } from "./types.ts";

interface PersistDesignGenerationVariant {
  id: string;
  index: number;
  repeatTileUrl: string;
  repeatTileWorkId: string;
  accentTileUrl: string | null;
  accentTileWorkId: string | null;
  accentLayout: AccentLayout | null;
}

interface PersistDesignGenerationParams {
  generationId: string;
  userId: string;
  prompt: string;
  patternType: PatternType;
  fabricType: FabricType;
  requestMetadata: Record<string, unknown>;
  variants: PersistDesignGenerationVariant[];
}

const toAccentLayoutRecord = (
  accentLayout: AccentLayout | null,
): Record<string, unknown> | null =>
  accentLayout ? (accentLayout as unknown as Record<string, unknown>) : null;

export async function persistDesignGeneration(
  client: SupabaseClient,
  params: PersistDesignGenerationParams,
): Promise<void> {
  const { error } = await client.rpc("persist_design_generation", {
    generation: {
      id: params.generationId,
      user_id: params.userId,
      prompt: params.prompt,
      pattern_type: params.patternType,
      fabric_type: params.fabricType,
      request_metadata: params.requestMetadata,
    },
    variants: params.variants.map((variant) => ({
      id: variant.id,
      generation_id: params.generationId,
      variant_index: variant.index,
      repeat_tile_url: variant.repeatTileUrl,
      repeat_tile_work_id: variant.repeatTileWorkId,
      accent_tile_url: variant.accentTileUrl,
      accent_tile_work_id: variant.accentTileWorkId,
      accent_layout_json: toAccentLayoutRecord(variant.accentLayout),
      pattern_type: params.patternType,
      fabric_type: params.fabricType,
    })),
  });

  if (error) {
    throw error;
  }
}
