import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import {
  assessPatternPreparation,
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
