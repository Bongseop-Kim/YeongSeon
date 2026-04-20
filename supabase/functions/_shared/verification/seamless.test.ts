import { assertAlmostEquals, assertEquals } from "jsr:@std/assert@1.0.19";
import {
  applyEdgeFeather,
  measureSeamlessDelta,
  verifySeamlessTile,
} from "@/functions/_shared/verification/seamless.ts";

Deno.test(
  "measureSeamlessDelta returns ~0 for a perfectly uniform image",
  () => {
    const pixels = new Uint8ClampedArray(32 * 32 * 4);
    for (let index = 0; index < pixels.length; index += 4) {
      pixels[index] = 128;
      pixels[index + 1] = 128;
      pixels[index + 2] = 128;
      pixels[index + 3] = 255;
    }

    const result = measureSeamlessDelta({
      pixels,
      width: 32,
      height: 32,
      stripWidth: 4,
    });

    assertAlmostEquals(result.horizontalDeltaE, 0, 0.1);
    assertAlmostEquals(result.verticalDeltaE, 0, 0.1);
  },
);

Deno.test(
  "measureSeamlessDelta returns high ΔE for a clearly non-seamless image",
  () => {
    const width = 32;
    const height = 32;
    const pixels = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const isLeft = x < width / 2;
        const index = (y * width + x) * 4;
        pixels[index] = isLeft ? 0 : 255;
        pixels[index + 1] = isLeft ? 0 : 255;
        pixels[index + 2] = isLeft ? 0 : 255;
        pixels[index + 3] = 255;
      }
    }

    const result = measureSeamlessDelta({
      pixels,
      width,
      height,
      stripWidth: 4,
    });
    if (result.horizontalDeltaE < 30) {
      throw new Error(`expected high ΔE, got ${result.horizontalDeltaE}`);
    }
  },
);

Deno.test(
  "applyEdgeFeather reduces boundary delta E for mildly mismatched edges",
  () => {
    const width = 16;
    const height = 16;
    const pixels = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const value = x < width / 2 ? 120 : 135;
        pixels[index] = value;
        pixels[index + 1] = value;
        pixels[index + 2] = value;
        pixels[index + 3] = 255;
      }
    }

    const before = measureSeamlessDelta({
      pixels,
      width,
      height,
      stripWidth: 4,
    });
    const feathered = applyEdgeFeather({
      pixels,
      width,
      height,
      featherWidth: 4,
    });
    const after = measureSeamlessDelta({
      pixels: feathered,
      width,
      height,
      stripWidth: 4,
    });

    assertEquals(after.horizontalDeltaE < before.horizontalDeltaE, true);
  },
);

Deno.test("verifySeamlessTile rejects strongly mismatched edges", () => {
  const width = 32;
  const height = 32;
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 255;
    pixels[index + 1] = 255;
    pixels[index + 2] = 255;
    pixels[index + 3] = 255;
  }

  for (let y = 0; y < height; y += 1) {
    const leftIndex = y * width * 4;
    pixels[leftIndex] = 0;
    pixels[leftIndex + 1] = 0;
    pixels[leftIndex + 2] = 0;
  }

  const result = verifySeamlessTile({ pixels, width, height, stripWidth: 4 });
  assertEquals(result.status, "reject");
});
