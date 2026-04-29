import { toAccentLayout } from "@/entities/design/api/design-session-mapper";
import type { Attachment } from "@/entities/design/model/ai-design-types";
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
const ROUTE_SET = new Set(["tile_generation", "tile_edit"]);

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

function toRequestMetadata(value: unknown): DesignGenerationRequestMetadata {
  if (!isRecord(value)) {
    return { selectedColors: [], attachments: [], route: "tile_generation" };
  }

  const selectedColors = Array.isArray(value.selectedColors)
    ? value.selectedColors.filter(
        (color): color is string => typeof color === "string",
      )
    : [];
  const route =
    typeof value.route === "string" && ROUTE_SET.has(value.route)
      ? (value.route as "tile_generation" | "tile_edit")
      : "tile_generation";

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
    ...(isRecord(value.designContext)
      ? {
          designContext:
            value.designContext as DesignGenerationRequestMetadata["designContext"],
        }
      : {}),
  };
}

function toDesignGenerationVariant(
  row: DesignGenerationVariantRow,
): DesignGenerationVariant {
  const patternType = toPatternType(row.pattern_type);
  const fabricType = toFabricType(row.fabric_type);

  if (!patternType) {
    throw new Error(
      `invalid generation variant pattern_type: ${row.pattern_type}`,
    );
  }
  if (!fabricType) {
    throw new Error(
      `invalid generation variant fabric_type: ${row.fabric_type}`,
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
    patternType,
    fabricType,
    createdAt: row.created_at,
  };
}

export function toDesignGeneration(row: DesignGenerationRow): DesignGeneration {
  const patternType = toPatternType(row.pattern_type);
  const fabricType = toFabricType(row.fabric_type);

  if (!patternType) {
    throw new Error(`invalid generation pattern_type: ${row.pattern_type}`);
  }
  if (!fabricType) {
    throw new Error(`invalid generation fabric_type: ${row.fabric_type}`);
  }

  return {
    id: row.id,
    userId: row.user_id,
    prompt: row.prompt,
    patternType,
    fabricType,
    requestMetadata: toRequestMetadata(row.request_metadata),
    variants: [...row.design_generation_variants]
      .sort((a, b) => a.variant_index - b.variant_index)
      .map(toDesignGenerationVariant),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
