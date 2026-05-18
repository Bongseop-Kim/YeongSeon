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
      accentLayouts: [1, 2, 3, 4].map(() => ({
        objectDescription: "crest",
        objectSource: "text",
        color: "gold",
        size: "medium",
      })),
    });

    assertEquals(response.variants.length, 4);
    response.variants.forEach((variant, index) => {
      const expectedIndex = index + 1;

      assertEquals(variant.repeatTileUrl, `repeat-${expectedIndex}`);
      assertEquals(variant.repeatTileWorkId, `repeat-work-${expectedIndex}`);
      assertEquals(variant.accentTileUrl, `accent-${expectedIndex}`);
      assertEquals(variant.accentTileWorkId, `accent-work-${expectedIndex}`);
    });
  },
);

Deno.test(
  "buildTileGenerationVariantResponse rejects one_point without matching accent results",
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
          accentLayouts: [],
        }),
      Error,
      "one_point generation requires matching accent results",
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
      accentLayouts: [],
    });

    assertEquals(
      response.variants.map((variant) => variant.accentTileUrl),
      [null, null, null, null],
    );
  },
);

Deno.test(
  "buildTileGenerationVariantResponse supports fewer requested variants",
  () => {
    const response = buildTileGenerationVariantResponse({
      generationId: "gen-1",
      prompt: "두 개",
      patternType: "all_over",
      fabricType: "printed",
      repeatResults: [1, 2].map((index) => ({
        url: `repeat-${index}`,
        workId: `repeat-work-${index}`,
      })),
      accentResults: [],
      accentLayouts: [],
    });

    assertEquals(response.variants.length, 2);
    assertEquals(
      response.variants.map((variant) => variant.index),
      [1, 2],
    );
  },
);
