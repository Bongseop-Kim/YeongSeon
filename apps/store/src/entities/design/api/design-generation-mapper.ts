import { toAccentLayout } from "@/entities/design/api/design-session-mapper";
import type { Attachment } from "@/entities/design/model/ai-design-types";
import type {
  CiPlacement,
  FabricMethod,
  PatternOption,
} from "@/entities/design/model/design-context";
import type {
  DesignGeneration,
  DesignGenerationRequestMetadata,
  DesignGenerationVariant,
} from "@/entities/design/model/design-generation";
import type {
  FabricType,
  PatternType,
} from "@/entities/design/model/tile-types";
import { createEnumMapper } from "@/shared/lib/enum-mapper";
import { isRecord } from "@/shared/lib/type-guard";

const PATTERN_TYPE_SET: ReadonlySet<PatternType> = new Set([
  "all_over",
  "one_point",
]);
const FABRIC_TYPE_SET: ReadonlySet<FabricType> = new Set([
  "yarn_dyed",
  "printed",
]);
const ROUTE_SET: ReadonlySet<DesignGenerationRequestMetadata["route"]> =
  new Set(["tile_generation", "tile_edit"]);
const REQUIRED_VARIANT_INDEXES = [1, 2, 3, 4] as const;

const toPatternType = createEnumMapper<PatternType>(PATTERN_TYPE_SET);
const toFabricType = createEnumMapper<FabricType>(FABRIC_TYPE_SET);

export interface DesignGenerationVariantRow {
  id: string;
  generation_id: string;
  variant_index: number;
  repeat_tile_url: string;
  repeat_tile_work_id: string;
  accent_tile_url: string | null;
  accent_tile_work_id: string | null;
  accent_layout_json: unknown;
  pattern_type: string;
  fabric_type: string;
  created_at: string;
}

export interface DesignGenerationRow {
  id: string;
  user_id: string;
  prompt: string;
  pattern_type: string;
  fabric_type: string;
  request_metadata: unknown;
  created_at: string;
  updated_at: string;
  design_generation_variants: DesignGenerationVariantRow[];
}

function toVariantIndex(value: number): 1 | 2 | 3 | 4 {
  if (value === 1 || value === 2 || value === 3 || value === 4) {
    return value;
  }

  throw new Error(`invalid variant index: ${value}`);
}

function toAttachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).flatMap((item) => {
    const type = item.type;
    const label = item.label;
    const itemValue = item.value;
    const fileName = item.fileName;

    if (
      (type !== "color" &&
        type !== "pattern" &&
        type !== "fabric" &&
        type !== "image" &&
        type !== "ci-placement") ||
      typeof label !== "string" ||
      typeof itemValue !== "string"
    ) {
      return [];
    }

    return [
      {
        type,
        label,
        value: itemValue,
        ...(typeof fileName === "string" ? { fileName } : {}),
      },
    ];
  });
}

function isPatternOption(value: unknown): value is PatternOption {
  return (
    value === "stripe" ||
    value === "dot" ||
    value === "check" ||
    value === "paisley" ||
    value === "plain" ||
    value === "houndstooth" ||
    value === "floral"
  );
}

function isFabricMethod(value: unknown): value is FabricMethod {
  return value === "yarn-dyed" || value === "print";
}

function isCiPlacement(value: unknown): value is CiPlacement {
  return value === "all-over" || value === "one-point";
}

function toDesignContext(
  value: unknown,
): DesignGenerationRequestMetadata["designContext"] | undefined {
  if (!isRecord(value)) return undefined;

  const designContext: DesignGenerationRequestMetadata["designContext"] = {};

  if (
    Array.isArray(value.colors) &&
    value.colors.every((color) => typeof color === "string")
  ) {
    designContext.colors = value.colors;
  }
  if (isPatternOption(value.pattern)) {
    designContext.pattern = value.pattern;
  } else if (value.pattern === null) {
    designContext.pattern = null;
  }
  if (isFabricMethod(value.fabricMethod)) {
    designContext.fabricMethod = value.fabricMethod;
  } else if (value.fabricMethod === null) {
    designContext.fabricMethod = null;
  }
  if (typeof value.onePointOffsetX === "number") {
    designContext.onePointOffsetX = value.onePointOffsetX;
  }
  if (typeof value.onePointOffsetY === "number") {
    designContext.onePointOffsetY = value.onePointOffsetY;
  }
  if (isCiPlacement(value.ciPlacement)) {
    designContext.ciPlacement = value.ciPlacement;
  } else if (value.ciPlacement === null) {
    designContext.ciPlacement = null;
  }

  return Object.keys(designContext).length > 0 ? designContext : undefined;
}

function toRequestMetadata(value: unknown): DesignGenerationRequestMetadata {
  if (!isRecord(value)) {
    throw new TypeError(
      "Invalid or missing route in DesignGenerationRequestMetadata",
    );
  }

  const selectedColors = Array.isArray(value.selectedColors)
    ? value.selectedColors.filter(
        (color): color is string => typeof color === "string",
      )
    : [];
  if (
    typeof value.route !== "string" ||
    !ROUTE_SET.has(value.route as DesignGenerationRequestMetadata["route"])
  ) {
    throw new TypeError(
      "Invalid or missing route in DesignGenerationRequestMetadata",
    );
  }
  const route = value.route as DesignGenerationRequestMetadata["route"];
  const designContext = toDesignContext(value.designContext);

  return {
    selectedColors,
    attachments: toAttachments(value.attachments),
    route,
    ...(typeof value.sourceGenerationId === "string"
      ? { sourceGenerationId: value.sourceGenerationId }
      : {}),
    ...(typeof value.sourceVariantId === "string"
      ? { sourceVariantId: value.sourceVariantId }
      : {}),
    ...(designContext ? { designContext } : {}),
  };
}

function toDesignGenerationVariant(
  row: DesignGenerationVariantRow,
  parentPatternType: PatternType,
  parentFabricType: FabricType,
): DesignGenerationVariant {
  const patternType = toPatternType(row.pattern_type);
  const fabricType = toFabricType(row.fabric_type);

  if (!patternType || patternType !== parentPatternType) {
    throw new Error(
      `generation variant pattern_type mismatch: ${row.pattern_type}`,
    );
  }
  if (!fabricType || fabricType !== parentFabricType) {
    throw new Error(
      `generation variant fabric_type mismatch: ${row.fabric_type}`,
    );
  }
  if (!row.repeat_tile_url || !row.repeat_tile_work_id) {
    throw new Error("variant requires repeat tile");
  }
  if (
    patternType === "one_point" &&
    (!row.accent_tile_url || !row.accent_tile_work_id)
  ) {
    throw new Error("one_point variant requires accent tile");
  }
  if (
    patternType === "all_over" &&
    (row.accent_tile_url || row.accent_tile_work_id)
  ) {
    throw new Error("all_over variant must not include accent tile");
  }

  return {
    id: row.id,
    generationId: row.generation_id,
    index: toVariantIndex(row.variant_index),
    repeatTile: {
      url: row.repeat_tile_url,
      workId: row.repeat_tile_work_id,
    },
    accentTile:
      row.accent_tile_url && row.accent_tile_work_id
        ? { url: row.accent_tile_url, workId: row.accent_tile_work_id }
        : null,
    accentLayout: toAccentLayout(row.accent_layout_json),
    patternType: parentPatternType,
    fabricType: parentFabricType,
    createdAt: row.created_at,
  };
}

export function toDesignGeneration(row: DesignGenerationRow): DesignGeneration {
  const patternType = toPatternType(row.pattern_type);
  const fabricType = toFabricType(row.fabric_type);
  const sortedVariants = [...row.design_generation_variants].sort(
    (a, b) => a.variant_index - b.variant_index,
  );
  const variantIndexes = new Set(
    row.design_generation_variants.map((variant) => variant.variant_index),
  );

  if (!patternType) {
    throw new Error(`invalid generation pattern_type: ${row.pattern_type}`);
  }
  if (!fabricType) {
    throw new Error(`invalid generation fabric_type: ${row.fabric_type}`);
  }
  if (
    variantIndexes.size !== REQUIRED_VARIANT_INDEXES.length ||
    !REQUIRED_VARIANT_INDEXES.every((index) => variantIndexes.has(index))
  ) {
    throw new Error(
      `generation requires unique variant indexes 1..4: ${row.id}`,
    );
  }

  return {
    id: row.id,
    userId: row.user_id,
    prompt: row.prompt,
    patternType,
    fabricType,
    requestMetadata: toRequestMetadata(row.request_metadata),
    variants: sortedVariants.map((variant) =>
      toDesignGenerationVariant(variant, patternType, fabricType),
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
