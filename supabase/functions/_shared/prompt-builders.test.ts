import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.19";
import {
  resolveRenderCapability,
  type FabricMethod,
} from "@/functions/_shared/render-capability.ts";
import {
  buildCiPlacementPrompt,
  buildFabricPrompt,
  buildFalPatternPrompt,
  buildPatternPrompt,
  buildReferencePrompt,
} from "@/functions/_shared/prompt-builders.ts";

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

Deno.test(
  "buildCiPlacementPrompt uses a self-contained fallback for one-point backgroundPattern",
  () => {
    const prompt = buildCiPlacementPrompt("one-point", true, null);

    assertEquals(prompt.includes("primary color described above"), false);
    assertEquals(prompt.includes("solid"), true);
  },
);

const DEFAULT_FAL_PATTERN_LINE =
  "Render the surface as a high-quality silk fabric.";
const DEFAULT_FABRIC_PROMPT =
  "This must be a high-quality silk fabric surface with refined textile character.";

const createPatternPrompt = (fabricMethod: string | null) =>
  buildFalPatternPrompt({
    colors: ["#1a2c5b", "#b8860b"],
    pattern: "check",
    fabricMethod,
    ciPlacement: "all-over",
    scale: "medium",
  });

Deno.test("resolveRenderCapability maps known fabric methods", () => {
  assertEquals(
    resolveRenderCapability("yarn-dyed")?.id,
    "woven_texture_render",
  );
  assertEquals(resolveRenderCapability("print")?.id, "printed_surface_render");
  assertEquals(resolveRenderCapability(null), null);
  assertEquals(resolveRenderCapability(undefined), null);
});

Deno.test("buildFalPatternPrompt preserves yarn-dyed wording", () => {
  assertEquals(
    createPatternPrompt("yarn-dyed"),
    [
      "This is a fabric texture transfer task, not a creative generation.",
      "The input image already contains the exact logo shapes, positions, and repetition spacing that must be preserved at pixel level.",
      "Apply only fabric texture and lighting on top of the existing logos and background.",
      "Do not invent new motifs. Do not change logo shapes. Do not change logo positions. Do not change the repetition pattern.",
      "Render the surface as woven silk with visible thread interlacing, a soft natural sheen, and subtle fabric weave.",
      "Dominant color palette: navy, dark gold.",
      "Soft uniform front lighting. No folds, creases, drape, or shadows. The fabric lies perfectly flat. Edge-to-edge fabric swatch.",
    ].join(" "),
  );
});

Deno.test("buildFalPatternPrompt preserves print wording", () => {
  assertEquals(
    createPatternPrompt("print"),
    [
      "This is a fabric texture transfer task, not a creative generation.",
      "The input image already contains the exact logo shapes, positions, and repetition spacing that must be preserved at pixel level.",
      "Apply only fabric texture and lighting on top of the existing logos and background.",
      "Do not invent new motifs. Do not change logo shapes. Do not change logo positions. Do not change the repetition pattern.",
      "Render the surface as printed silk with crisp printed color on a smooth lustrous fabric and no thread texture.",
      "Dominant color palette: navy, dark gold.",
      "Soft uniform front lighting. No folds, creases, drape, or shadows. The fabric lies perfectly flat. Edge-to-edge fabric swatch.",
    ].join(" "),
  );
});

Deno.test(
  "buildFalPatternPrompt keeps default wording without a capability",
  () => {
    assertStringIncludes(createPatternPrompt("yarn-dyed"), "woven silk");
    assertStringIncludes(createPatternPrompt("print"), "printed silk");
    assertStringIncludes(
      createPatternPrompt("unknown" as FabricMethod),
      DEFAULT_FAL_PATTERN_LINE,
    );
  },
);

Deno.test("buildFabricPrompt preserves existing construction strings", () => {
  assertEquals(
    buildFabricPrompt("yarn-dyed"),
    [
      "Fabric construction: yarn-dyed woven silk.",
      "The pattern is formed entirely by interwoven threads — visible weave structure, subtle textile depth, and a genuine woven repeat.",
      "Each motif appears as a single solid thread color against the background, rendered as a clean silhouette.",
      "The pattern emerges from the thread interlacing itself, not from printing.",
      "The surface has the tactile, slightly textured quality of woven jacquard silk.",
    ].join(" "),
  );

  assertEquals(
    buildFabricPrompt("print"),
    [
      "Fabric construction: printed silk.",
      "The pattern is screen-printed or digitally printed directly onto the fabric surface — crisp edges, vibrant colors, and surface-applied graphics.",
      "Multi-color details within each motif are fully supported: crisp outlines, gradients, fine inner details, and multiple colors per motif.",
      "The surface is smooth and lustrous, with the clean flat quality of printed silk.",
      "No thread texture, no weave structure, no fiber depth — the surface is as flat and smooth as coated paper.",
    ].join(" "),
  );

  assertEquals(buildFabricPrompt("unknown"), DEFAULT_FABRIC_PROMPT);
});

Deno.test("buildPatternPrompt preserves yarn-dyed detail hint only", () => {
  assertEquals(
    buildPatternPrompt("check", "yarn-dyed"),
    "Pattern: repeating check grid. Render each motif as a single-color silhouette only — no inner color variation or detail.",
  );
  assertEquals(
    buildPatternPrompt("check", "print"),
    "Pattern: repeating check grid.",
  );
});

Deno.test("buildReferencePrompt preserves fabric labels", () => {
  assertStringIncludes(
    buildReferencePrompt(true, false, "yarn-dyed"),
    "strictly yarn-dyed woven",
  );
  assertStringIncludes(
    buildReferencePrompt(true, false, "print"),
    "strictly printed",
  );
  assertStringIncludes(
    buildReferencePrompt(true, false, "unknown"),
    "strictly fabric",
  );
});
