import type { AiGenerationLogInsert } from "@/functions/_shared/log-generation.ts";
import type { GeneratedTile } from "./image-generator.ts";
import type { AccentLayout, FabricType, PatternType } from "./types.ts";

type SuccessfulTileGenerationBaseLog = Omit<
  AiGenerationLogInsert,
  | "image_generated"
  | "generated_image_url"
  | "tokens_charged"
  | "tokens_refunded"
  | "repeat_tile_url"
  | "repeat_tile_work_id"
  | "accent_tile_url"
  | "accent_tile_work_id"
  | "pattern_type"
  | "fabric_type"
  | "tile_role"
  | "paired_tile_work_id"
  | "accent_layout_json"
>;

export interface BuildSuccessfulTileGenerationLogsParams {
  baseLog: SuccessfulTileGenerationBaseLog;
  repeatResults: GeneratedTile[];
  accentResults: GeneratedTile[];
  primaryWorkId: string;
  tokensCharged: number;
  tokensRefunded: number;
  patternType: PatternType;
  fabricType: FabricType;
  accentLayouts: AccentLayout[];
  reusedRepeatTile: boolean;
}

const toAccentLayoutRecord = (
  accentLayout: AccentLayout | null,
): Record<string, unknown> | null =>
  accentLayout ? (accentLayout as unknown as Record<string, unknown>) : null;

export function buildSuccessfulTileGenerationLogs({
  baseLog,
  repeatResults,
  accentResults,
  primaryWorkId,
  tokensCharged,
  tokensRefunded,
  patternType,
  fabricType,
  accentLayouts,
  reusedRepeatTile,
}: BuildSuccessfulTileGenerationLogsParams): AiGenerationLogInsert[] {
  if (repeatResults.length !== 4) {
    throw new Error("generation logs require 4 repeat results");
  }

  if (patternType === "one_point" && accentResults.length !== 4) {
    throw new Error("one_point generation logs require 4 accent results");
  }

  if (patternType === "all_over" && accentResults.length !== 0) {
    throw new Error("all_over generation logs must not include accent results");
  }
  if (patternType === "one_point" && accentLayouts.length !== 4) {
    throw new Error("one_point generation logs require 4 accent layouts");
  }

  const logs: AiGenerationLogInsert[] = [];

  repeatResults.forEach((repeatResult, index) => {
    const accentResult = accentResults[index] ?? null;
    const accentLayoutRecord = toAccentLayoutRecord(
      accentResult ? accentLayouts[index] : null,
    );
    const shared = {
      ...baseLog,
      generate_image: true,
      image_generated: true,
      tokens_refunded:
        repeatResult.workId === primaryWorkId ? tokensRefunded : 0,
      repeat_tile_url: repeatResult.url,
      repeat_tile_work_id: repeatResult.workId,
      accent_tile_url: accentResult?.url ?? null,
      accent_tile_work_id: accentResult?.workId ?? null,
      pattern_type: patternType,
      fabric_type: fabricType,
      accent_layout_json: accentResult ? accentLayoutRecord : null,
    } satisfies Partial<AiGenerationLogInsert>;

    if (!reusedRepeatTile) {
      logs.push({
        ...shared,
        work_id: repeatResult.workId,
        generated_image_url: repeatResult.url,
        tokens_charged:
          repeatResult.workId === primaryWorkId ? tokensCharged : 0,
        tile_role: "repeat",
        paired_tile_work_id: accentResult?.workId ?? null,
      } as AiGenerationLogInsert);
    }

    if (!accentResult) return;

    logs.push({
      ...shared,
      work_id: accentResult.workId,
      parent_work_id: repeatResult.workId,
      generated_image_url: accentResult.url,
      tokens_charged: accentResult.workId === primaryWorkId ? tokensCharged : 0,
      tokens_refunded:
        accentResult.workId === primaryWorkId ? tokensRefunded : 0,
      tile_role: "accent",
      paired_tile_work_id: repeatResult.workId,
    } as AiGenerationLogInsert);
  });

  return logs;
}
