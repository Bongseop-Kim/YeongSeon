import { tileLogoOnCanvas } from "@/entities/design/api/tile-logo-on-canvas";
import type {
  CiPlacement,
  FabricMethod,
} from "@/entities/design/model/design-context";
import type { Scale } from "@/entities/design/model/design-scale";

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

interface PreparePatternSourceInput {
  sourceImageBase64: string;
  sourceImageMimeType: string;
  placementMode: Extract<CiPlacement, "all-over" | "one-point">;
  fabricMethod: FabricMethod | null;
  scale: NonNullable<Scale>;
  backgroundColor?: string;
}

const decodeBase64ToBlob = (base64: string, mimeType: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
};

const blobToBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 32 * 1024;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.slice(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const getBinaryMask = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) => {
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  const background = corners.reduce(
    (acc, index) => {
      acc.r += pixels[index];
      acc.g += pixels[index + 1];
      acc.b += pixels[index + 2];
      return acc;
    },
    { r: 0, g: 0, b: 0 },
  );
  const backgroundRgb = {
    r: background.r / corners.length,
    g: background.g / corners.length,
    b: background.b / corners.length,
  };
  const mask = new Uint8Array(width * height);

  for (let index = 0; index < width * height; index += 1) {
    const pixelIndex = index * 4;
    const alpha = pixels[pixelIndex + 3];
    const distance =
      Math.abs(pixels[pixelIndex] - backgroundRgb.r) +
      Math.abs(pixels[pixelIndex + 1] - backgroundRgb.g) +
      Math.abs(pixels[pixelIndex + 2] - backgroundRgb.b);

    mask[index] = alpha > 16 && distance > 48 ? 1 : 0;
  }

  return mask;
};

const getConnectedComponents = (
  mask: Uint8Array,
  width: number,
  height: number,
): number => {
  const visited = new Uint8Array(mask.length);
  let count = 0;

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) {
      continue;
    }

    count += 1;
    const queue = [index];
    visited[index] = 1;

    while (queue.length > 0) {
      const current = queue.pop();
      if (current === undefined) {
        continue;
      }

      const x = current % width;
      const y = Math.floor(current / width);
      const neighbors = [
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || !mask[neighbor] || visited[neighbor]) {
          continue;
        }
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
  }

  return count;
};

const computeMetrics = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): PatternPreparationMetrics => {
  const mask = getBinaryMask(pixels, width, height);
  let opaqueCount = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const quantizedColors = new Set<string>();
  let detailTransitions = 0;
  let edgeTouches = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!mask[index]) {
        continue;
      }

      opaqueCount += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      if (x < 4 || x >= width - 4 || y < 4 || y >= height - 4) {
        edgeTouches += 1;
      }

      const pixelIndex = index * 4;
      quantizedColors.add(
        [
          Math.round(pixels[pixelIndex] / 64),
          Math.round(pixels[pixelIndex + 1] / 64),
          Math.round(pixels[pixelIndex + 2] / 64),
        ].join(":"),
      );

      if (x < width - 1 && mask[index + 1] !== mask[index]) {
        detailTransitions += 1;
      }
      if (y < height - 1 && mask[index + width] !== mask[index]) {
        detailTransitions += 1;
      }
    }
  }

  const bboxWidth = maxX >= minX ? maxX - minX + 1 : 0;
  const bboxHeight = maxY >= minY ? maxY - minY + 1 : 0;
  const left = minX;
  const right = width - maxX - 1;
  const top = minY;
  const bottom = height - maxY - 1;
  const margins = [left, right, top, bottom].filter((value) => value >= 0);
  const averageMargin =
    margins.reduce((sum, value) => sum + value, 0) / (margins.length || 1);
  const outerMarginVariance =
    averageMargin > 0
      ? Math.max(...margins.map((value) => Math.abs(value - averageMargin))) /
        averageMargin
      : 0;
  const componentCount = getConnectedComponents(mask, width, height);

  return {
    opaqueCoverageRatio: opaqueCount / Math.max(1, width * height),
    dominantColorCount: quantizedColors.size,
    internalDetailRatio: detailTransitions / Math.max(1, opaqueCount),
    componentCount,
    edgeTouchRatio: edgeTouches / Math.max(1, opaqueCount),
    outerMarginVariance,
    spacingVariance: Math.min(1, Math.max(0, (componentCount - 1) / 6)),
    singleMotifConfidence:
      bboxWidth === 0 || bboxHeight === 0
        ? 0
        : 1 - Math.min(1, (componentCount - 1) / 3),
  };
};

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

const renderPreparedSource = async (
  imageBase64: string,
  mimeType: string,
  silhouetteOnly: boolean,
): Promise<string> => {
  const image = await createImageBitmap(
    decodeBase64ToBlob(imageBase64, mimeType),
  );
  try {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to acquire 2D context on OffscreenCanvas");
    }

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const mask = getBinaryMask(imageData.data, image.width, image.height);

    for (let index = 0; index < mask.length; index += 1) {
      const pixelIndex = index * 4;
      if (!mask[index]) {
        imageData.data[pixelIndex + 3] = 0;
        continue;
      }

      if (silhouetteOnly) {
        imageData.data[pixelIndex] = 0;
        imageData.data[pixelIndex + 1] = 0;
        imageData.data[pixelIndex + 2] = 0;
        imageData.data[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return await blobToBase64(blob);
  } finally {
    image.close();
  }
};

export async function preparePatternSource(
  input: PreparePatternSourceInput,
): Promise<PatternPreparationResult> {
  const image = await createImageBitmap(
    decodeBase64ToBlob(input.sourceImageBase64, input.sourceImageMimeType),
  );

  try {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to acquire 2D context on OffscreenCanvas");
    }

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const assessed = assessPatternPreparation({
      placementMode: input.placementMode,
      fabricMethod: input.fabricMethod,
      metrics: computeMetrics(imageData.data, image.width, image.height),
    });
    const preparedSourceBase64 = await renderPreparedSource(
      input.sourceImageBase64,
      input.sourceImageMimeType,
      input.fabricMethod === "yarn-dyed",
    );

    if (input.placementMode === "all-over") {
      const tile = await tileLogoOnCanvas({
        logoBase64: preparedSourceBase64,
        logoMimeType: "image/png",
        scale: input.scale,
        backgroundColor: input.backgroundColor,
      });

      return {
        ...assessed,
        preparedSourceBase64,
        preparedSourceMimeType: "image/png",
        preparedPatternTileBase64: tile.base64,
        preparedPatternTileMimeType: tile.mimeType,
      };
    }

    return {
      ...assessed,
      preparedSourceBase64,
      preparedSourceMimeType: "image/png",
      preparedPointMotifTileBase64: preparedSourceBase64,
      preparedPointMotifTileMimeType: "image/png",
    };
  } finally {
    image.close();
  }
}
