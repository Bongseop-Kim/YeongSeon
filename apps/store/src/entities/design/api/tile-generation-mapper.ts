import { isRecord } from "@/shared/lib/type-guard";
import { toAccentLayout } from "@/entities/design/api/design-session-mapper";
import type {
  FabricType,
  PatternType,
  TileGenerationPayload,
  TileGenerationResult,
  TileRef,
} from "@/entities/design/model/tile-types";

export interface TileGenerationInvokePayload extends Omit<
  TileGenerationPayload,
  "previousRepeatTile" | "previousAccentTile"
> {
  previousRepeatTileUrl: string | null;
  previousRepeatTileWorkId: string | null;
  previousAccentTileUrl: string | null;
  previousAccentTileWorkId: string | null;
}

const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const toPatternType = (value: unknown): PatternType | null =>
  value === "all_over" || value === "one_point" ? value : null;

const toFabricType = (value: unknown): FabricType | null =>
  value === "yarn_dyed" || value === "printed" ? value : null;

const toTileRef = (
  url: unknown,
  workId: unknown,
  fieldName: string,
): TileRef => {
  const normalizedUrl = toStringOrNull(url);
  const normalizedWorkId = toStringOrNull(workId);

  if (!normalizedUrl || !normalizedWorkId) {
    throw new Error(`Invalid generate-tile response: ${fieldName} is missing`);
  }

  return { url: normalizedUrl, workId: normalizedWorkId };
};

const toOptionalTileRef = (
  url: unknown,
  workId: unknown,
  fieldName: string,
): TileRef | null => {
  if (url == null && workId == null) {
    return null;
  }

  return toTileRef(url, workId, fieldName);
};

export function toTileGenerationInvokePayload(
  payload: TileGenerationPayload,
): TileGenerationInvokePayload {
  const { previousRepeatTile, previousAccentTile, ...rest } = payload;

  return {
    ...rest,
    previousRepeatTileUrl: previousRepeatTile?.url ?? null,
    previousRepeatTileWorkId: previousRepeatTile?.workId ?? null,
    previousAccentTileUrl: previousAccentTile?.url ?? null,
    previousAccentTileWorkId: previousAccentTile?.workId ?? null,
  };
}

export function normalizeInvokeResponse(raw: unknown): TileGenerationResult {
  if (!isRecord(raw)) {
    throw new Error("Invalid generate-tile response: expected object");
  }

  const patternType = toPatternType(raw.patternType) ?? "all_over";
  const fabricType = toFabricType(raw.fabricType) ?? "printed";

  return {
    repeatTile: toTileRef(
      raw.repeatTileUrl,
      raw.repeatTileWorkId,
      "repeatTile",
    ),
    accentTile: toOptionalTileRef(
      raw.accentTileUrl,
      raw.accentTileWorkId,
      "accentTile",
    ),
    patternType,
    fabricType,
    accentLayout: toAccentLayout(raw.accentLayout),
  };
}
