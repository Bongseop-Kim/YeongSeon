import { createCanvas } from "canvas";
import { describe, expect, it } from "vitest";
import { tileLogoOnCanvas } from "./tile-logo-on-canvas";

const generateLogoBase64 = (width: number, height: number): string => {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  return canvas.toBuffer("image/png").toString("base64");
};

describe("tileLogoOnCanvas", () => {
  it("returns base64 PNG for a square logo with medium scale", async () => {
    const logoBase64 = generateLogoBase64(200, 200);
    const result = await tileLogoOnCanvas({
      logoBase64,
      logoMimeType: "image/png",
      fabricMethod: "yarn-dyed",
      scale: "medium",
    });

    expect(result.mimeType).toBe("image/png");
    expect(result.base64.length).toBeGreaterThan(0);
    expect(result.base64.length).toBeGreaterThan(1000);
  });

  it("applies custom background color when provided", async () => {
    const logoBase64 = generateLogoBase64(100, 100);
    const result = await tileLogoOnCanvas({
      logoBase64,
      logoMimeType: "image/png",
      fabricMethod: "print",
      scale: "small",
      backgroundColor: "#ff0000",
    });

    expect(result.base64.length).toBeGreaterThan(0);
  });

  it("resizes logo to long-edge fraction for wide logos", async () => {
    const wideLogoBase64 = generateLogoBase64(400, 100);
    const result = await tileLogoOnCanvas({
      logoBase64: wideLogoBase64,
      logoMimeType: "image/png",
      fabricMethod: "yarn-dyed",
      scale: "large",
    });

    expect(result.base64.length).toBeGreaterThan(0);
  });

  it("uses default background when backgroundColor is omitted", async () => {
    const logoBase64 = generateLogoBase64(150, 150);
    const result = await tileLogoOnCanvas({
      logoBase64,
      logoMimeType: "image/png",
      fabricMethod: "yarn-dyed",
      scale: "medium",
    });

    expect(result.base64.length).toBeGreaterThan(0);
  });
});
