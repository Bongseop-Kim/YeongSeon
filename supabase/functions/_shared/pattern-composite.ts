import {
  ImageMagick,
  initializeImageMagick,
  MagickColor,
  MagickFormat,
  MagickImage,
  MagickImageInfo,
  MagickReadSettings,
  Point,
} from "npm:@imagemagick/magick-wasm@0.0.30";
import { bytesToBase64 } from "@/functions/_shared/color.ts";

export type PatternPreparationReasonCode =
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

export interface PatternPreparationResult {
  placementMode: "all-over" | "one-point";
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
  tileSizePx: number;
  gapPx: number;
  compositeCanvasWidth: number;
  compositeCanvasHeight: number;
  harmonizationApplied: boolean;
  harmonizationBackend: "fal" | "openai" | null;
}

interface ImageRgbaData {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}

const TILE_CANVAS_SIZE = 1024;
const ONE_POINT_CANVAS_WIDTH = 316;
const ONE_POINT_CANVAS_HEIGHT = 600;
const MAX_EDGE = 1024;

const SCALE_TO_LOGO_RATIO = {
  large: 0.2,
  medium: 0.12,
  small: 0.07,
} as const;

const SCALE_TO_STRIDE_RATIO = {
  large: 0.25,
  medium: 0.15,
  small: 0.09,
} as const;

let magickInitialized: Promise<void> | null = null;

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export const bytesToPngBase64 = (bytes: Uint8Array): string =>
  bytesToBase64(bytes);

export const ensureImageMagick = async (): Promise<void> => {
  if (!magickInitialized) {
    magickInitialized = (async () => {
      const wasmBytes = await Deno.readFile(
        new URL(
          "magick.wasm",
          import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.30"),
        ),
      );
      await initializeImageMagick(wasmBytes);
    })();
  }

  await magickInitialized;
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

export const computeMetrics = (
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

export function assessPatternPreparation(input: {
  placementMode: "all-over" | "one-point";
  fabricMethod: string | null;
  metrics: PatternPreparationMetrics;
}): Omit<
  PatternPreparationResult,
  | "preparedPatternTileBase64"
  | "preparedPatternTileMimeType"
  | "preparedPointMotifTileBase64"
  | "preparedPointMotifTileMimeType"
  | "preparedSourceBase64"
  | "preparedSourceMimeType"
  | "tileSizePx"
  | "gapPx"
  | "compositeCanvasWidth"
  | "compositeCanvasHeight"
  | "harmonizationApplied"
  | "harmonizationBackend"
> {
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
        "background_not_tile_friendly",
        "low_confidence",
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

export const resolveTileCompositeMetrics = (
  scale: "large" | "medium" | "small",
) => {
  const tileSizePx = Math.round(TILE_CANVAS_SIZE * SCALE_TO_LOGO_RATIO[scale]);
  const stridePx = Math.round(TILE_CANVAS_SIZE * SCALE_TO_STRIDE_RATIO[scale]);
  return {
    tileSizePx,
    gapPx: Math.max(0, stridePx - tileSizePx),
    compositeCanvasWidth: TILE_CANVAS_SIZE,
    compositeCanvasHeight: TILE_CANVAS_SIZE,
  };
};

export const resolveOnePointCompositeMetrics = (
  scale: "large" | "medium" | "small",
) => ({
  tileSizePx: Math.round(ONE_POINT_CANVAS_WIDTH * SCALE_TO_LOGO_RATIO[scale]),
  gapPx: 0,
  compositeCanvasWidth: ONE_POINT_CANVAS_WIDTH,
  compositeCanvasHeight: ONE_POINT_CANVAS_HEIGHT,
});

const getMaskBounds = (mask: Uint8Array, width: number, height: number) => {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) {
        continue;
      }

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    minX,
    minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};

export const readImageRgba = async (
  bytes: Uint8Array,
): Promise<ImageRgbaData> => {
  await ensureImageMagick();

  return await ImageMagick.read(bytes, async (image) => ({
    pixels: await image.write(
      MagickFormat.Rgba,
      (rgba) => new Uint8ClampedArray(rgba),
    ),
    width: image.width,
    height: image.height,
  }));
};

export const maybeDownscaleImage = async (
  bytes: Uint8Array,
): Promise<Uint8Array> => {
  await ensureImageMagick();
  const info = MagickImageInfo.create(bytes);
  const longEdge = Math.max(info.width, info.height);
  if (longEdge <= MAX_EDGE) {
    return bytes;
  }

  return await ImageMagick.read(bytes, async (image) => {
    const scale = MAX_EDGE / longEdge;
    image.resize(
      Math.max(1, Math.round(image.width * scale)),
      Math.max(1, Math.round(image.height * scale)),
    );
    return await image.write(MagickFormat.Png, (data) => data);
  });
};

const rgbaToPngBytes = async (
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<Uint8Array> => {
  await ensureImageMagick();
  const settings = new MagickReadSettings({
    format: MagickFormat.Rgba,
    width,
    height,
  });
  const image = MagickImage.create();
  image.read(rgba, settings);
  return await image.write(MagickFormat.Png, (data) => data);
};

export const renderPreparedSource = async (
  image: ImageRgbaData,
  silhouetteOnly: boolean,
): Promise<Uint8Array> => {
  const mask = getBinaryMask(image.pixels, image.width, image.height);
  const bounds = getMaskBounds(mask, image.width, image.height);

  if (!bounds) {
    return new Uint8Array();
  }

  const output = new Uint8Array(bounds.width * bounds.height * 4);

  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceX = bounds.minX + x;
      const sourceY = bounds.minY + y;
      const sourceIndex = sourceY * image.width + sourceX;
      const sourcePixelIndex = sourceIndex * 4;
      const targetPixelIndex = (y * bounds.width + x) * 4;

      if (!mask[sourceIndex]) {
        output[targetPixelIndex + 3] = 0;
        continue;
      }

      output[targetPixelIndex] = silhouetteOnly
        ? 0
        : image.pixels[sourcePixelIndex];
      output[targetPixelIndex + 1] = silhouetteOnly
        ? 0
        : image.pixels[sourcePixelIndex + 1];
      output[targetPixelIndex + 2] = silhouetteOnly
        ? 0
        : image.pixels[sourcePixelIndex + 2];
      output[targetPixelIndex + 3] = 255;
    }
  }

  return await rgbaToPngBytes(output, bounds.width, bounds.height);
};

export const composeAllOverTile = async (input: {
  spriteBytes: Uint8Array;
  backgroundColor: string;
  scale: "large" | "medium" | "small";
}): Promise<{
  tileBytes: Uint8Array;
  tileSizePx: number;
  gapPx: number;
  compositeCanvasWidth: number;
  compositeCanvasHeight: number;
}> => {
  await ensureImageMagick();
  const metrics = resolveTileCompositeMetrics(input.scale);

  const tileBytes = await ImageMagick.read(
    input.spriteBytes,
    async (sprite) => {
      const targetLongEdge = metrics.tileSizePx;
      const spriteScale =
        targetLongEdge / Math.max(sprite.width, sprite.height);
      sprite.resize(
        Math.max(1, Math.round(sprite.width * spriteScale)),
        Math.max(1, Math.round(sprite.height * spriteScale)),
      );

      const canvas = MagickImage.create(
        new MagickColor(input.backgroundColor),
        metrics.compositeCanvasWidth,
        metrics.compositeCanvasHeight,
      );
      const stride = metrics.tileSizePx + metrics.gapPx;

      for (let y = 0; y < metrics.compositeCanvasHeight; y += stride) {
        for (let x = 0; x < metrics.compositeCanvasWidth; x += stride) {
          canvas.composite(sprite, new Point(x, y));
        }
      }

      return await canvas.write(MagickFormat.Png, (data) => data);
    },
  );

  return { tileBytes, ...metrics };
};

export const composeOnePointMotif = async (input: {
  spriteBytes: Uint8Array;
  backgroundColor: string;
  scale: "large" | "medium" | "small";
}): Promise<{
  motifBytes: Uint8Array;
  tileSizePx: number;
  gapPx: number;
  compositeCanvasWidth: number;
  compositeCanvasHeight: number;
}> => {
  await ensureImageMagick();
  const metrics = resolveOnePointCompositeMetrics(input.scale);

  const motifBytes = await ImageMagick.read(
    input.spriteBytes,
    async (sprite) => {
      const scale = metrics.tileSizePx / Math.max(sprite.width, sprite.height);
      sprite.resize(
        Math.max(1, Math.round(sprite.width * scale)),
        Math.max(1, Math.round(sprite.height * scale)),
      );

      const canvas = MagickImage.create(
        new MagickColor(input.backgroundColor),
        metrics.compositeCanvasWidth,
        metrics.compositeCanvasHeight,
      );
      const x = Math.round((metrics.compositeCanvasWidth - sprite.width) / 2);
      const y = Math.round((metrics.compositeCanvasHeight - sprite.height) / 2);

      canvas.composite(sprite, new Point(x, y));
      return await canvas.write(MagickFormat.Png, (data) => data);
    },
  );

  return { motifBytes, ...metrics };
};

export const toPngBase64 = (bytes: Uint8Array) => bytesToPngBase64(bytes);

export const decodeBase64Image = (base64: string): Uint8Array =>
  base64ToBytes(base64);
