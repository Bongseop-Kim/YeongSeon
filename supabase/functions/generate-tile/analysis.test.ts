import { assertEquals } from "jsr:@std/assert";
import { createFallbackDiversityPlan, planDiversity } from "./analysis.ts";
import type { AnalysisOutput, TileGenerationRequest } from "./types.ts";

const baseAnalysis: AnalysisOutput = {
  intent: "new",
  patternType: "all_over",
  editTarget: "new",
  fabricTypeHint: null,
  referenceImageUsage: "none",
  tileLayout: {
    structure: "F",
    variation: null,
    motifs: [{ name: "rose", color: null, colors: null }],
    backgroundColor: "ivory",
  },
  accentLayout: null,
};

const baseRequest: TileGenerationRequest = {
  route: "tile_generation",
  userMessage: "장미 자카드 넥타이 패턴",
  uiFabricType: "yarn_dyed",
  selectedColors: ["ivory"],
  previousFabricType: null,
  previousRepeatTileUrl: null,
  previousRepeatTileWorkId: null,
  previousAccentTileUrl: null,
  previousAccentTileWorkId: null,
  previousAccentLayoutJson: null,
  conversationHistory: [],
  attachedImageUrls: [],
  sessionId: "session-1",
  workflowId: "workflow-1",
  firstMessage: "장미 자카드 넥타이 패턴",
  allMessages: [],
};

const withMockedFetch = async (
  fetchImpl: typeof fetch,
  body: () => Promise<void>,
) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    await body();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const withOpenAiKey = async (body: () => Promise<void>) => {
  const originalApiKey = Deno.env.get("OPENAI_API_KEY");
  Deno.env.set("OPENAI_API_KEY", "test-key");
  try {
    await body();
  } finally {
    if (originalApiKey == null) {
      Deno.env.delete("OPENAI_API_KEY");
    } else {
      Deno.env.set("OPENAI_API_KEY", originalApiKey);
    }
  }
};

Deno.test(
  "createFallbackDiversityPlan returns structure-specific deterministic variants",
  () => {
    const plan = createFallbackDiversityPlan(
      baseRequest,
      baseAnalysis,
      "yarn_dyed",
    );

    assertEquals(plan.baseAnalysis, baseAnalysis);
    assertEquals(plan.variants.length, 4);
    assertEquals(
      plan.variants.map((variant) => [
        variant.tileLayout.structure,
        variant.tileLayout.variation,
      ]),
      [
        ["F", null],
        ["F", null],
        ["F", null],
        ["F", null],
      ],
    );
    assertEquals(plan.cohesionAnchor.fabricType, "yarn_dyed");
    assertEquals(plan.cohesionAnchor.backgroundColor, "ivory");
    assertEquals(plan.cohesionAnchor.motifKernel, "rose");
  },
);

Deno.test(
  "createFallbackDiversityPlan varies density and color for single-variation families",
  () => {
    const plan = createFallbackDiversityPlan(
      baseRequest,
      {
        ...baseAnalysis,
        tileLayout: {
          ...baseAnalysis.tileLayout,
          structure: "MEDALLION",
          variation: "medallion_classic",
        },
      },
      "printed",
    );

    assertEquals(
      plan.variants.map((variant) => [
        variant.tileLayout.structure,
        variant.tileLayout.variation,
      ]),
      [
        ["MEDALLION", "medallion_classic"],
        ["MEDALLION", "medallion_classic"],
        ["MEDALLION", "medallion_classic"],
        ["MEDALLION", "medallion_classic"],
      ],
    );
    assertEquals(
      plan.variants.map((variant) => variant.styleDirection.density),
      ["minimal", "balanced", "maximal", "minimal"],
    );
    assertEquals(
      plan.variants.map((variant) => variant.motifInterpretation.colorEmphasis),
      ["balanced", "dominant", "monochrome", "high_contrast"],
    );
    assertEquals(
      plan.variants.some((variant) =>
        variant.styleDirection.medium.includes("stripe"),
      ),
      false,
    );
  },
);

Deno.test(
  "planDiversity returns 4 model-provided generation specs",
  async () => {
    const modelPlan = {
      variants: [1, 2, 3, 4].map((index) => ({
        id: `variant_${index}`,
        tileLayout: {
          ...baseAnalysis.tileLayout,
          structure: index === 1 ? "STRIPE" : "GEOMETRIC",
          variation: index === 1 ? "stripe_regimental" : "geometric_diamond",
          motifs: [
            {
              name: `rose interpretation ${index}`,
              color: null,
              colors: null,
            },
          ],
        },
        accentLayout: null,
        motifInterpretation: {
          axis: [
            "iconographic",
            "geometric_abstract",
            "textural_abstract",
            "symbolic_variation",
          ][index - 1],
          description: `rose direction ${index}`,
          colorEmphasis: "balanced",
        },
        styleDirection: {
          medium: `medium ${index}`,
          aestheticVector: `vector ${index}`,
          density: "balanced",
        },
        referenceImageUsage: "none",
      })),
      cohesionAnchor: {
        fabricType: "yarn_dyed",
        backgroundColor: "ivory",
        motifKernel: "rose",
      },
    };

    await withOpenAiKey(async () => {
      await withMockedFetch(
        () =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                choices: [{ message: { content: JSON.stringify(modelPlan) } }],
              }),
              { status: 200 },
            ),
          ),
        async () => {
          const plan = await planDiversity(
            baseRequest,
            baseAnalysis,
            "yarn_dyed",
          );

          assertEquals(plan.variants.length, 4);
          assertEquals(plan.variants[0]?.id, "variant_1");
          assertEquals(plan.variants[0]?.tileLayout.structure, "STRIPE");
          assertEquals(
            plan.variants[0]?.tileLayout.variation,
            "stripe_regimental",
          );
          assertEquals(
            plan.variants[1]?.motifInterpretation.axis,
            "geometric_abstract",
          );
          assertEquals(plan.cohesionAnchor.motifKernel, "rose");
        },
      );
    });
  },
);

Deno.test(
  "planDiversity normalizes invalid structure and variation combinations",
  async () => {
    const modelPlan = {
      variants: [1, 2, 3, 4].map((index) => ({
        id: `variant_${index}`,
        tileLayout: {
          ...baseAnalysis.tileLayout,
          structure: "DOT",
          variation: index === 1 ? "stripe_regimental" : "dot_micro",
        },
        accentLayout: null,
        motifInterpretation: {
          axis: [
            "iconographic",
            "geometric_abstract",
            "textural_abstract",
            "symbolic_variation",
          ][index - 1],
          description: `rose direction ${index}`,
          colorEmphasis: "balanced",
        },
        styleDirection: {
          medium: `medium ${index}`,
          aestheticVector: `vector ${index}`,
          density: "balanced",
        },
        referenceImageUsage: "none",
      })),
      cohesionAnchor: {
        fabricType: "yarn_dyed",
        backgroundColor: "ivory",
        motifKernel: "rose",
      },
    };

    await withOpenAiKey(async () => {
      await withMockedFetch(
        () =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                choices: [{ message: { content: JSON.stringify(modelPlan) } }],
              }),
              { status: 200 },
            ),
          ),
        async () => {
          const plan = await planDiversity(
            baseRequest,
            baseAnalysis,
            "yarn_dyed",
          );

          assertEquals(plan.variants[0]?.tileLayout.structure, "DOT");
          assertEquals(plan.variants[0]?.tileLayout.variation, null);
        },
      );
    });
  },
);

Deno.test(
  "planDiversity falls back when model returns fewer than 4 variants",
  async () => {
    await withOpenAiKey(async () => {
      await withMockedFetch(
        () =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        variants: [],
                        cohesionAnchor: {
                          fabricType: "yarn_dyed",
                          backgroundColor: "ivory",
                          motifKernel: "rose",
                        },
                      }),
                    },
                  },
                ],
              }),
              { status: 200 },
            ),
          ),
        async () => {
          const plan = await planDiversity(
            baseRequest,
            baseAnalysis,
            "yarn_dyed",
          );

          assertEquals(plan.variants.length, 4);
          assertEquals(plan.variants[0]?.tileLayout.structure, "F");
          assertEquals(plan.variants[0]?.tileLayout.variation, null);
        },
      );
    });
  },
);
