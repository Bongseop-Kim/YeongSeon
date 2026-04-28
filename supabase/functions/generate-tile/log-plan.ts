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
  repeatResult: GeneratedTile;
  accentResult: GeneratedTile | null;
  primaryWorkId: string;
  tokensCharged: number;
  tokensRefunded: number;
  patternType: PatternType;
  fabricType: FabricType;
  accentLayout: AccentLayout | null;
  reusedRepeatTile: boolean;
}

const toAccentLayoutRecord = (
  accentLayout: AccentLayout | null,
): Record<string, unknown> | null =>
  accentLayout ? (accentLayout as unknown as Record<string, unknown>) : null;

export function buildSuccessfulTileGenerationLogs({
  baseLog,
  repeatResult,
  accentResult,
  primaryWorkId,
  tokensCharged,
  tokensRefunded,
  patternType,
  fabricType,
  accentLayout,
  reusedRepeatTile,
}: BuildSuccessfulTileGenerationLogsParams): AiGenerationLogInsert[] {
  const accentLayoutRecord = toAccentLayoutRecord(accentLayout);
  const shared = {
    ...baseLog,
    generate_image: true,
    image_generated: true,
    tokens_refunded: tokensRefunded,
    repeat_tile_url: repeatResult.url,
    repeat_tile_work_id: repeatResult.workId,
    accent_tile_url: accentResult?.url ?? null,
    accent_tile_work_id: accentResult?.workId ?? null,
    pattern_type: patternType,
    fabric_type: fabricType,
    accent_layout_json: accentLayoutRecord,
  } satisfies Partial<AiGenerationLogInsert>;

  const primaryIsAccent = primaryWorkId === accentResult?.workId;
  const primaryLog: AiGenerationLogInsert = {
    ...shared,
    work_id: primaryWorkId,
    generated_image_url: primaryIsAccent ? accentResult.url : repeatResult.url,
    tokens_charged: tokensCharged,
    tile_role: primaryIsAccent ? "accent" : "repeat",
    paired_tile_work_id: primaryIsAccent
      ? repeatResult.workId
      : (accentResult?.workId ?? null),
  } as AiGenerationLogInsert;

  if (!accentResult || accentResult.workId === primaryWorkId) {
    return [primaryLog];
  }

  const accentLog: AiGenerationLogInsert = {
    ...shared,
    work_id: accentResult.workId,
    parent_work_id: repeatResult.workId,
    generated_image_url: accentResult.url,
    tokens_charged: 0,
    tile_role: "accent",
    paired_tile_work_id: repeatResult.workId,
  } as AiGenerationLogInsert;

  if (reusedRepeatTile) {
    return [primaryLog];
  }

  return [primaryLog, accentLog];
}
