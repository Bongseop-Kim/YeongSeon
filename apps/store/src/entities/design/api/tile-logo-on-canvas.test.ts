import { createCanvas, loadImage } from "canvas";
import { describe, expect, it } from "vitest";
import { tileLogoOnCanvas } from "./tile-logo-on-canvas";

const DEFAULT_BACKGROUND_RGB = { r: 232, g: 228, b: 222, a: 255 };
const BLACK_RGB = { r: 0, g: 0, b: 0, a: 255 };

const generateLogoBase64 = (width: number, height: number): string => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  return canvas.toBuffer("image/png").toString("base64");
};

const decodePng = async (base64: string) => {
  const image = await loadImage(Buffer.from(base64, "base64"));
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return { ctx, width: image.width, height: image.height };
};

const getPixel = (
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  x: number,
  y: number,
) => {
  const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
  return { r, g, b, a };
};

describe("tileLogoOnCanvas", () => {
  it("returns base64 PNG for a square logo with medium scale", async () => {
    const logoBase64 = generateLogoBase64(200, 200);
    const result = await tileLogoOnCanvas({
      logoBase64,
      logoMimeType: "image/png",
      scale: "medium",
    });

    expect(result.mimeType).toBe("image/png");
    expect(result.base64.length).toBeGreaterThan(0);
    const { ctx } = await decodePng(result.base64);
    expect(getPixel(ctx, 20, 20)).toEqual(BLACK_RGB);
  });

  it("applies custom background color when provided", async () => {
    const logoBase64 = generateLogoBase64(100, 100);
    const result = await tileLogoOnCanvas({
      logoBase64,
      logoMimeType: "image/png",
      scale: "large",
      backgroundColor: "#ff0000",
    });

    const { ctx, width, height } = await decodePng(result.base64);
    expect(getPixel(ctx, width - 1, height - 1)).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 255,
    });
  });

  it("tiles wide logos across multiple stride positions", async () => {
    const wideLogoBase64 = generateLogoBase64(400, 100);
    const result = await tileLogoOnCanvas({
      logoBase64: wideLogoBase64,
      logoMimeType: "image/png",
      scale: "large",
    });

    const { ctx } = await decodePng(result.base64);
    expect(getPixel(ctx, 20, 20)).toEqual(BLACK_RGB);
    expect(getPixel(ctx, 276, 20)).toEqual(BLACK_RGB);
    expect(getPixel(ctx, 532, 20)).toEqual(BLACK_RGB);
    expect(getPixel(ctx, 230, 20)).toEqual(DEFAULT_BACKGROUND_RGB);
  });

  it("uses default background when backgroundColor is omitted", async () => {
    const logoBase64 = generateLogoBase64(150, 150);
    const result = await tileLogoOnCanvas({
      logoBase64,
      logoMimeType: "image/png",
      scale: "medium",
    });

    const { ctx } = await decodePng(result.base64);
    expect(getPixel(ctx, 140, 20)).toEqual(DEFAULT_BACKGROUND_RGB);
  });
});
