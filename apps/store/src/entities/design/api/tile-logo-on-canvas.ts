import type { FabricMethod } from "../model/design-context";
import type { Scale } from "../model/design-scale";

type TileScale = NonNullable<Scale>;

interface TileLogoOnCanvasInput {
  logoBase64: string;
  logoMimeType: string;
  fabricMethod?: FabricMethod;
  scale: TileScale;
  backgroundColor?: string;
  canvasSize?: number;
}

interface TileLogoOnCanvasResult {
  base64: string;
  mimeType: "image/png";
}

type ImageBitmapLike = Awaited<ReturnType<typeof createImageBitmap>>;

const SCALE_TO_LOGO_RATIO: Record<TileScale, number> = {
  large: 0.2,
  medium: 0.12,
  small: 0.07,
};

const SCALE_TO_STRIDE_RATIO: Record<TileScale, number> = {
  large: 0.25,
  medium: 0.15,
  small: 0.09,
};

const DEFAULT_BACKGROUND = "#e8e4de";
const DEFAULT_CANVAS_SIZE = 1024;

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

const drawTiledPattern = (
  ctx: OffscreenCanvasRenderingContext2D,
  logoBitmap: ImageBitmapLike,
  canvasSize: number,
  stride: number,
  drawWidth: number,
  drawHeight: number,
) => {
  const tileCount = Math.ceil(canvasSize / stride);

  for (let yIndex = 0; yIndex < tileCount; yIndex += 1) {
    const yPos = Math.round(yIndex * stride);
    for (let xIndex = 0; xIndex < tileCount; xIndex += 1) {
      const xPos = Math.round(xIndex * stride);
      ctx.drawImage(logoBitmap, xPos, yPos, drawWidth, drawHeight);
    }
  }
};

export async function tileLogoOnCanvas(
  input: TileLogoOnCanvasInput,
): Promise<TileLogoOnCanvasResult> {
  const canvasSize = input.canvasSize ?? DEFAULT_CANVAS_SIZE;
  const backgroundColor = input.backgroundColor ?? DEFAULT_BACKGROUND;
  const logoBlob = decodeBase64ToBlob(input.logoBase64, input.logoMimeType);
  const logoBitmap = await createImageBitmap(logoBlob);
  try {
    const logoLongEdge = Math.max(logoBitmap.width, logoBitmap.height);
    const targetLongEdge = canvasSize * SCALE_TO_LOGO_RATIO[input.scale];
    const stride = canvasSize * SCALE_TO_STRIDE_RATIO[input.scale];
    const logoScaleFactor = targetLongEdge / logoLongEdge;
    const drawWidth = logoBitmap.width * logoScaleFactor;
    const drawHeight = logoBitmap.height * logoScaleFactor;
    const canvas = new OffscreenCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to acquire 2D context on OffscreenCanvas");
    }

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    drawTiledPattern(
      ctx,
      logoBitmap,
      canvasSize,
      stride,
      drawWidth,
      drawHeight,
    );

    const outputBlob = await canvas.convertToBlob({ type: "image/png" });
    const base64 = await blobToBase64(outputBlob);

    return { base64, mimeType: "image/png" };
  } finally {
    logoBitmap.close();
  }
}
