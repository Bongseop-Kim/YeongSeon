import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.19";
import { buildCiPlacementPrompt } from "@/functions/_shared/prompt-builders.ts";

Deno.test(
  "buildCiPlacementPrompt injects solid backgroundPattern for one-point",
  () => {
    const prompt = buildCiPlacementPrompt("one-point", true, {
      type: "solid",
      color: "#1a2c55",
    });

    assertStringIncludes(prompt, "#1a2c55");
    assertStringIncludes(prompt, "solid");
  },
);

Deno.test(
  "buildCiPlacementPrompt injects stripe backgroundPattern for one-point",
  () => {
    const prompt = buildCiPlacementPrompt("one-point", true, {
      type: "stripe",
      width: 8,
      colors: ["#1a2c55", "#ffffff"],
    });

    assertStringIncludes(prompt, "stripe");
    assertStringIncludes(prompt, "8");
    assertStringIncludes(prompt, "#1a2c55");
  },
);

Deno.test(
  "buildCiPlacementPrompt omits backgroundPattern clause for all-over",
  () => {
    const prompt = buildCiPlacementPrompt("all-over", true, {
      type: "solid",
      color: "#1a2c55",
    });

    assertEquals(prompt.includes("#1a2c55"), false);
  },
);
