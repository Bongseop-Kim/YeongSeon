import {
  assertEquals,
  assertExists,
  assertLess,
  assertObjectMatch,
  assertRejects,
} from "jsr:@std/assert";
import {
  assessPatternPreparation,
  buildOpenAiEditCanvas,
  computeMetrics,
  readImageRgba,
  renderPreparedSource,
  resolveOnePointCompositeMetrics,
  resolveTileCompositeMetrics,
} from "@/functions/_shared/pattern-composite.ts";

Deno.test(
  "resolveTileCompositeMetrics maps scale to deterministic tile sizes",
  () => {
    assertObjectMatch(resolveTileCompositeMetrics("small"), {
      tileSizePx: 72,
      gapPx: 20,
      compositeCanvasWidth: 1024,
      compositeCanvasHeight: 1024,
    });
    assertObjectMatch(resolveTileCompositeMetrics("medium"), {
      tileSizePx: 123,
      gapPx: 31,
      compositeCanvasWidth: 1024,
      compositeCanvasHeight: 1024,
    });
    assertObjectMatch(resolveTileCompositeMetrics("large"), {
      tileSizePx: 205,
      gapPx: 51,
      compositeCanvasWidth: 1024,
      compositeCanvasHeight: 1024,
    });
  },
);

Deno.test(
  "resolveOnePointCompositeMetrics keeps one-point canvas fixed",
  () => {
    assertObjectMatch(resolveOnePointCompositeMetrics("medium"), {
      tileSizePx: 38,
      gapPx: 0,
      compositeCanvasWidth: 316,
      compositeCanvasHeight: 600,
    });
  },
);

Deno.test(
  "assessPatternPreparation marks unsuitable one-point motifs for repair",
  () => {
    const result = assessPatternPreparation({
      placementMode: "one-point",
      fabricMethod: "yarn-dyed",
      metrics: {
        opaqueCoverageRatio: 0.5,
        dominantColorCount: 5,
        internalDetailRatio: 0.25,
        componentCount: 4,
        edgeTouchRatio: 0.01,
        outerMarginVariance: 0,
        spacingVariance: 0,
        singleMotifConfidence: 0.2,
      },
    });

    assertEquals(result.sourceStatus, "repair_required");
    assertEquals(result.fabricStatus, "repair_required");
    assertEquals(result.preparedSourceKind, "original");
    assertEquals(
      result.reasonCodes.includes("not_suitable_for_one_point"),
      true,
    );
    assertEquals(
      result.reasonCodes.includes("too_many_colors_for_yarn_dyed"),
      true,
    );
  },
);

Deno.test(
  "computeMetrics ignores a single contaminated corner when estimating background",
  () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4);

    for (let index = 0; index < width * height; index += 1) {
      const pixelIndex = index * 4;
      pixels[pixelIndex] = 255;
      pixels[pixelIndex + 1] = 255;
      pixels[pixelIndex + 2] = 255;
      pixels[pixelIndex + 3] = 255;
    }

    const setPixel = (x: number, y: number, rgb: [number, number, number]) => {
      const pixelIndex = (y * width + x) * 4;
      pixels[pixelIndex] = rgb[0];
      pixels[pixelIndex + 1] = rgb[1];
      pixels[pixelIndex + 2] = rgb[2];
    };

    setPixel(0, 0, [0, 0, 0]);
    setPixel(4, 4, [0, 0, 0]);
    setPixel(4, 5, [0, 0, 0]);
    setPixel(5, 4, [0, 0, 0]);
    setPixel(5, 5, [0, 0, 0]);

    const metrics = computeMetrics(pixels, width, height);

    assertLess(metrics.opaqueCoverageRatio, 0.2);
    assertEquals(metrics.componentCount, 2);
  },
);

Deno.test("buildOpenAiEditCanvas rejects empty input", async () => {
  await assertRejects(
    () => buildOpenAiEditCanvas(new Uint8Array()),
    Error,
    "prepared_source_empty",
  );
});

Deno.test(
  "buildOpenAiEditCanvas accepts bytes emitted by renderPreparedSource",
  async () => {
    const width = 12;
    const height = 12;
    const pixels = new Uint8ClampedArray(width * height * 4);

    for (let index = 0; index < width * height; index += 1) {
      const pixelIndex = index * 4;
      pixels[pixelIndex] = 255;
      pixels[pixelIndex + 1] = 255;
      pixels[pixelIndex + 2] = 255;
      pixels[pixelIndex + 3] = 255;
    }

    for (let y = 3; y < 9; y += 1) {
      for (let x = 2; x < 10; x += 1) {
        const pixelIndex = (y * width + x) * 4;
        pixels[pixelIndex] = 0;
        pixels[pixelIndex + 1] = x % 2 === 0 ? 0 : 120;
        pixels[pixelIndex + 2] = y % 2 === 0 ? 0 : 120;
      }
    }

    const prepared = await renderPreparedSource(
      { pixels, width, height },
      true,
    );
    assertExists(prepared);

    for (let iteration = 0; iteration < 5; iteration += 1) {
      await renderPreparedSource({ pixels, width, height }, false);
    }

    const canvas = await buildOpenAiEditCanvas(prepared.bytes);
    const decoded = await readImageRgba(canvas.bytes);

    assertEquals(decoded.width, 1024);
    assertEquals(decoded.height, 1024);
  },
);
