import { isRecord } from "@/shared/lib/type-guard";
import { createEnumMapper } from "@/shared/lib/enum-mapper";
import { toAccentLayout } from "@/entities/design/api/design-session-mapper";
import type {
  FabricType,
  PatternType,
  TileGenerationPayload,
  TileGenerationResult,
  TileRef,
} from "@/entities/design/model/tile-types";

interface TileGenerationInvokePayload extends Omit<
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

const PATTERN_TYPE_SET: ReadonlySet<PatternType> = new Set([
  "all_over",
  "one_point",
]);
const FABRIC_TYPE_SET: ReadonlySet<FabricType> = new Set([
  "yarn_dyed",
  "printed",
]);

const toPatternType = createEnumMapper<PatternType>(PATTERN_TYPE_SET);
const toFabricType = createEnumMapper<FabricType>(FABRIC_TYPE_SET);

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

  const repeatTile = toTileRef(
    raw.repeatTileUrl,
    raw.repeatTileWorkId,
    "repeatTile",
  );
  const accentTile = toOptionalTileRef(
    raw.accentTileUrl,
    raw.accentTileWorkId,
    "accentTile",
  );
  const patternType = toPatternType(raw.patternType);
  const fabricType = toFabricType(raw.fabricType);

  if (!patternType) {
    throw new Error(
      `Invalid generate-tile response: patternType is invalid (${String(raw.patternType)})`,
    );
  }

  if (!fabricType) {
    throw new Error(
      `Invalid generate-tile response: fabricType is invalid (${String(raw.fabricType)})`,
    );
  }

  return {
    repeatTile,
    accentTile,
    patternType,
    fabricType,
    accentLayout: toAccentLayout(raw.accentLayout),
  };
}
