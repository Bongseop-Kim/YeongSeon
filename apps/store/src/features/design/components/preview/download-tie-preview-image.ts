import { getRawImageUrlFromPreviewBackground } from "@/shared/lib/to-preview-background";

const DEFAULT_WIDTH = 316;
const DEFAULT_HEIGHT = 600;
const TILE_SIZE = 35;
const SHADOW_TOP_OFFSET = -57;

interface DownloadTiePreviewImageInput {
  imageUrl: string | null;
  repeatTileUrl?: string | null;
  unmasked: boolean;
  filename: string;
  width?: number;
  height?: number;
}

const loadImage = async (src: string): Promise<HTMLImageElement> => {
  const image = new Image();
  if (!src.startsWith("data:")) {
    image.crossOrigin = "anonymous";
  }
  const loadPromise = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
  });
  image.src = src;

  try {
    await image.decode();
  } catch {
    if (image.complete && image.naturalWidth > 0) {
      return image;
    }
    await loadPromise;
  }

  return image;
};

const drawCoverImage = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) => {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
};

const drawRepeatedTile = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) => {
  for (let y = 0; y < height; y += TILE_SIZE) {
    for (let x = 0; x < width; x += TILE_SIZE) {
      ctx.drawImage(image, x, y, TILE_SIZE, TILE_SIZE);
    }
  }
};

const applyTieMask = (
  ctx: CanvasRenderingContext2D,
  maskImg: HTMLImageElement,
  width: number,
  height: number,
) => {
  const maskScale = Math.min(
    width / maskImg.naturalWidth,
    height / maskImg.naturalHeight,
  );
  const maskW = maskImg.naturalWidth * maskScale;
  const maskH = maskImg.naturalHeight * maskScale;
  const maskX = (width - maskW) / 2;
  const maskY = (height - maskH) / 2;
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(maskImg, maskX, maskY, maskW, maskH);
  ctx.globalCompositeOperation = "source-over";
};

const drawTieShadow = (
  ctx: CanvasRenderingContext2D,
  shadowImg: HTMLImageElement,
  width: number,
) => {
  const shadowScale = width / shadowImg.naturalWidth;
  const shadowH = shadowImg.naturalHeight * shadowScale;
  ctx.drawImage(shadowImg, 0, SHADOW_TOP_OFFSET, width, shadowH);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
};

export const downloadTiePreviewImage = async ({
  imageUrl,
  repeatTileUrl,
  unmasked,
  filename,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: DownloadTiePreviewImageInput): Promise<void> => {
  const rawImageUrl =
    repeatTileUrl ?? getRawImageUrlFromPreviewBackground(imageUrl);
  if (!rawImageUrl) {
    throw new Error("이미지 URL을 추출할 수 없습니다.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas를 초기화할 수 없습니다.");
  }

  const image = await loadImage(rawImageUrl);
  if (repeatTileUrl) {
    drawRepeatedTile(ctx, image, width, height);
  } else {
    drawCoverImage(ctx, image, width, height);
  }

  if (!unmasked) {
    const [maskImg, shadowImg] = await Promise.all([
      loadImage("/images/tie.svg"),
      loadImage("/images/tieShadow.png"),
    ]);
    applyTieMask(ctx, maskImg, width, height);
    drawTieShadow(ctx, shadowImg, width);
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) {
    throw new Error("이미지를 변환할 수 없습니다.");
  }

  downloadBlob(blob, filename);
};
