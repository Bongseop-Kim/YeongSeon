/// <reference lib="dom" />
import { describe, expect, it } from "vitest";
import { rescaleMaskToTarget } from "@/features/design/lib/rescale-mask";

function makeCanvas(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2d-context-unavailable");
  }

  draw(context);
  return canvas;
}

describe("rescaleMaskToTarget", () => {
  it("목표 크기로 리사이즈한다", async () => {
    const source = makeCanvas(32, 32, (context) => {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, 32, 32);
    });

    const output = await rescaleMaskToTarget(source, {
      width: 128,
      height: 128,
    });

    expect(output.width).toBe(128);
    expect(output.height).toBe(128);
  });

  it("중간 회색을 흑백으로 이진화한다", async () => {
    const source = makeCanvas(2, 2, (context) => {
      const image = context.createImageData(2, 2);
      image.data.set([
        200, 200, 200, 255, 50, 50, 50, 255, 200, 200, 200, 255, 50, 50, 50,
        255,
      ]);
      context.putImageData(image, 0, 0);
    });

    const output = await rescaleMaskToTarget(source, { width: 2, height: 2 });
    const context = output.getContext("2d");
    if (!context) {
      throw new Error("2d-context-unavailable");
    }

    const pixels = context.getImageData(0, 0, 2, 2).data;

    for (let index = 0; index < 16; index += 4) {
      expect([0, 255]).toContain(pixels[index]);
    }
  });

  it("확대 시 nearest-neighbor를 유지한다", async () => {
    const source = makeCanvas(2, 2, (context) => {
      const image = context.createImageData(2, 2);
      image.data.set([
        255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255,
      ]);
      context.putImageData(image, 0, 0);
    });

    const output = await rescaleMaskToTarget(source, { width: 4, height: 4 });
    const context = output.getContext("2d");
    if (!context) {
      throw new Error("2d-context-unavailable");
    }

    const pixels = context.getImageData(0, 0, 4, 4).data;
    expect(pixels[0]).toBe(255);
    expect(pixels[4]).toBe(255);
    expect(pixels[16]).toBe(255);
    expect(pixels[20]).toBe(255);
  });
});
