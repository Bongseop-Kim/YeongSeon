import { assertEquals, assertThrows } from "jsr:@std/assert";
import { buildTileGenerationVariantResponse } from "./variant-response.ts";

Deno.test(
  "buildTileGenerationVariantResponse pairs repeat and accent variants by index",
  () => {
    const response = buildTileGenerationVariantResponse({
      generationId: "gen-1",
      prompt: "원포인트",
      patternType: "one_point",
      fabricType: "yarn_dyed",
      repeatResults: [1, 2, 3, 4].map((index) => ({
        url: `repeat-${index}`,
        workId: `repeat-work-${index}`,
      })),
      accentResults: [1, 2, 3, 4].map((index) => ({
        url: `accent-${index}`,
        workId: `accent-work-${index}`,
      })),
      accentLayout: {
        objectDescription: "crest",
        objectSource: "text",
        color: "gold",
        size: "medium",
      },
    });

    assertEquals(response.variants.length, 4);
    assertEquals(response.variants[0].repeatTileUrl, "repeat-1");
    assertEquals(response.variants[0].accentTileUrl, "accent-1");
  },
);

Deno.test(
  "buildTileGenerationVariantResponse rejects one_point without 4 accent results",
  () => {
    assertThrows(
      () =>
        buildTileGenerationVariantResponse({
          generationId: "gen-1",
          prompt: "원포인트",
          patternType: "one_point",
          fabricType: "yarn_dyed",
          repeatResults: [1, 2, 3, 4].map((index) => ({
            url: `repeat-${index}`,
            workId: `repeat-work-${index}`,
          })),
          accentResults: [],
          accentLayout: null,
        }),
      Error,
      "one_point generation requires 4 accent results",
    );
  },
);

Deno.test(
  "buildTileGenerationVariantResponse keeps all_over accent fields null",
  () => {
    const response = buildTileGenerationVariantResponse({
      generationId: "gen-1",
      prompt: "올오버",
      patternType: "all_over",
      fabricType: "printed",
      repeatResults: [1, 2, 3, 4].map((index) => ({
        url: `repeat-${index}`,
        workId: `repeat-work-${index}`,
      })),
      accentResults: [],
      accentLayout: null,
    });

    assertEquals(
      response.variants.map((variant) => variant.accentTileUrl),
      [null, null, null, null],
    );
  },
);
