import type {
  CiPlacement,
  FabricMethod,
} from "@/entities/design/model/design-context";

type PatternPreparationReasonCode =
  | "non_seamless_edges"
  | "uneven_outer_margin"
  | "uneven_object_spacing"
  | "occupied_too_dense"
  | "background_not_tile_friendly"
  | "low_confidence"
  | "too_many_colors_for_yarn_dyed"
  | "detail_too_fine_for_yarn_dyed"
  | "not_suitable_for_one_point";

export interface PatternPreparationMetrics {
  opaqueCoverageRatio: number;
  dominantColorCount: number;
  internalDetailRatio: number;
  componentCount: number;
  edgeTouchRatio: number;
  outerMarginVariance: number;
  spacingVariance: number;
  singleMotifConfidence: number;
}

interface AssessPatternPreparationInput {
  placementMode: Extract<CiPlacement, "all-over" | "one-point">;
  fabricMethod: FabricMethod | null;
  metrics: PatternPreparationMetrics;
}

interface PatternPreparationResult {
  placementMode: Extract<CiPlacement, "all-over" | "one-point">;
  sourceStatus: "ready" | "repair_required";
  fabricStatus: "ready" | "repair_required";
  reasonCodes: PatternPreparationReasonCode[];
  preparedSourceKind: "original" | "repaired";
  preparationBackend: "local" | "openai_repair";
  repairApplied: boolean;
  repairPromptKind: "all_over_tile" | "one_point_motif" | null;
  repairSummary: string | null;
  prepTokensCharged?: number | null;
  userMessage: string;
  preparedPatternTileBase64?: string;
  preparedPatternTileMimeType?: "image/png";
  preparedPointMotifTileBase64?: string;
  preparedPointMotifTileMimeType?: "image/png";
  preparedSourceBase64?: string;
  preparedSourceMimeType?: "image/png";
}

export function assessPatternPreparation(
  input: AssessPatternPreparationInput,
): PatternPreparationResult {
  const { placementMode, fabricMethod, metrics } = input;
  const reasonCodes: PatternPreparationReasonCode[] = [];
  let sourceStatus: PatternPreparationResult["sourceStatus"] = "ready";
  let fabricStatus: PatternPreparationResult["fabricStatus"] = "ready";

  if (placementMode === "all-over") {
    if (metrics.edgeTouchRatio > 0.08) {
      reasonCodes.push("non_seamless_edges");
    }
    if (metrics.outerMarginVariance > 0.2) {
      reasonCodes.push("uneven_outer_margin");
    }
    if (metrics.spacingVariance > 0.3 || metrics.componentCount > 3) {
      reasonCodes.push("uneven_object_spacing");
    }
    if (metrics.opaqueCoverageRatio > 0.52) {
      reasonCodes.push("occupied_too_dense");
    }
  }

  if (placementMode === "one-point") {
    if (
      metrics.singleMotifConfidence < 0.5 ||
      metrics.componentCount > 2 ||
      metrics.opaqueCoverageRatio > 0.45
    ) {
      reasonCodes.push("not_suitable_for_one_point");
    }
  }

  if (fabricMethod === "yarn-dyed") {
    if (metrics.dominantColorCount > 3) {
      reasonCodes.push("too_many_colors_for_yarn_dyed");
    }
    if (metrics.internalDetailRatio > 0.2) {
      reasonCodes.push("detail_too_fine_for_yarn_dyed");
    }
  }

  if (
    reasonCodes.some((code) =>
      [
        "non_seamless_edges",
        "uneven_outer_margin",
        "uneven_object_spacing",
        "occupied_too_dense",
        "not_suitable_for_one_point",
      ].includes(code),
    )
  ) {
    sourceStatus = "repair_required";
  }

  if (
    reasonCodes.includes("too_many_colors_for_yarn_dyed") ||
    reasonCodes.includes("detail_too_fine_for_yarn_dyed")
  ) {
    fabricStatus = "repair_required";
  }

  const repaired =
    sourceStatus === "repair_required" || fabricStatus === "repair_required";

  return {
    placementMode,
    sourceStatus,
    fabricStatus,
    reasonCodes,
    preparedSourceKind: repaired ? "repaired" : "original",
    preparationBackend: "local",
    repairApplied: false,
    repairPromptKind: null,
    repairSummary: null,
    userMessage:
      placementMode === "one-point"
        ? repaired
          ? "첨부 이미지를 원포인트에 맞게 정리한 뒤 원단 제약에 맞춰 단순화했어요."
          : "첨부 이미지를 원포인트 모티프로 정리했어요."
        : repaired
          ? "첨부 이미지를 반복 패턴에 맞게 정리하고 원단 제약에 맞춰 단순화했어요."
          : "첨부 이미지를 반복 가능한 패턴 소스로 정리했어요.",
  };
}
