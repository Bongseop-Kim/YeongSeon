import { isRecord } from "@/shared/lib/type-guard";
import { createEnumMapper } from "@/shared/lib/enum-mapper";
import { toAccentLayout } from "@/entities/design/api/design-session-mapper";
import type {
  FabricType,
  PatternType,
  TileGenerationPayload,
  TileGenerationResult,
  TileGenerationVariantResult,
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

const toVariantIndex = (value: unknown): 1 | 2 | 3 | 4 => {
  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }

  throw new Error(
    `Invalid generate-tile response: variant index is invalid (${String(value)})`,
  );
};

const toRequiredString = (value: unknown, fieldName: string): string => {
  const normalized = toStringOrNull(value);

  if (!normalized) {
    throw new Error(`Invalid generate-tile response: ${fieldName} is missing`);
  }

  return normalized;
};

const toVariant = (raw: unknown): TileGenerationVariantResult => {
  if (!isRecord(raw)) {
    throw new Error("Invalid generate-tile response: variant is invalid");
  }

  return {
    id: toRequiredString(raw.id, "variant id"),
    index: toVariantIndex(raw.index),
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
    accentLayout: toAccentLayout(raw.accentLayout),
  };
};

const getRepresentativeVariant = (
  variants: TileGenerationVariantResult[],
): TileGenerationVariantResult => {
  const variantsByIndex = new Map<number, TileGenerationVariantResult>();

  for (const variant of variants) {
    if (!variantsByIndex.has(variant.index)) {
      variantsByIndex.set(variant.index, variant);
    }
  }

  const representative = [...variantsByIndex.entries()].sort(
    ([left], [right]) => left - right,
  )[0]?.[1];

  if (!representative) {
    throw new Error("Invalid generate-tile response: variants are missing");
  }

  return representative;
};

const validateVariantIndexes = (
  variants: TileGenerationVariantResult[],
): void => {
  const indexes = variants.map((variant) => variant.index);
  const uniqueIndexes = new Set(indexes);

  if (
    variants.length < 1 ||
    variants.length > 4 ||
    uniqueIndexes.size !== indexes.length
  ) {
    throw new Error(
      `Invalid generate-tile response: expected 1-4 unique variant indexes, received [${indexes.join(", ")}]`,
    );
  }
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

  const patternType = toPatternType(raw.patternType);
  const fabricType = toFabricType(raw.fabricType);
  const variants = Array.isArray(raw.variants)
    ? raw.variants
        .map(toVariant)
        .sort((left, right) => left.index - right.index)
    : [];

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

  validateVariantIndexes(variants);

  const representativeVariant = getRepresentativeVariant(variants);

  return {
    generationId: toRequiredString(raw.generationId, "generationId"),
    prompt: toStringOrNull(raw.prompt) ?? "",
    variants,
    repeatTile: representativeVariant.repeatTile,
    accentTile: representativeVariant.accentTile,
    patternType,
    fabricType,
    accentLayout: representativeVariant.accentLayout,
  };
}
