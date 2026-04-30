import type {
  AnalysisOutput,
  DiversityPlan,
  EditTarget,
  FabricType,
  GenerationSpec,
  TileGenerationRequest,
  TileStructure,
  TileVariation,
} from "./types.ts";
import { matchKeyword } from "./fabric-type-resolver.ts";

const ANALYSIS_MODEL = "gpt-4o-2024-08-06";
const DIVERSITY_VARIANT_COUNT = 4;

const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "intent",
    "patternType",
    "editTarget",
    "fabricTypeHint",
    "referenceImageUsage",
    "tileLayout",
    "accentLayout",
  ],
  properties: {
    intent: { type: "string", enum: ["new", "edit"] },
    patternType: { type: "string", enum: ["all_over", "one_point"] },
    editTarget: {
      type: "string",
      enum: ["repeat", "accent", "both", "new"],
    },
    fabricTypeHint: {
      anyOf: [
        { type: "string", enum: ["yarn_dyed", "printed"] },
        { type: "null" },
      ],
    },
    referenceImageUsage: {
      type: "string",
      enum: [
        "none",
        "single_motif",
        "composite_motif",
        "multiple_motifs",
        "repeat_and_accent",
      ],
    },
    tileLayout: {
      type: "object",
      additionalProperties: false,
      required: ["structure", "variation", "motifs", "backgroundColor"],
      properties: {
        structure: {
          type: "string",
          enum: [
            "H",
            "F",
            "Q",
            "STRIPE",
            "DOT",
            "TOSSED",
            "MEDALLION",
            "GEOMETRIC",
          ],
        },
        variation: {
          anyOf: [
            {
              type: "string",
              enum: [
                "rotation",
                "color",
                "different_motif",
                "stripe_classic_diagonal",
                "stripe_multi_width",
                "stripe_regimental",
                "stripe_textured",
                "stripe_dotted",
                "dot_micro",
                "dot_pin",
                "tossed_scattered",
                "medallion_classic",
                "geometric_diamond",
                "geometric_check",
                "geometric_herringbone",
              ],
            },
            { type: "null" },
          ],
        },
        motifs: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "color", "colors"],
            properties: {
              name: { type: "string" },
              color: { anyOf: [{ type: "string" }, { type: "null" }] },
              colors: {
                anyOf: [
                  {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 2,
                  },
                  { type: "null" },
                ],
              },
            },
          },
        },
        backgroundColor: { type: "string" },
      },
    },
    accentLayout: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["objectDescription", "objectSource", "color", "size"],
          properties: {
            objectDescription: { type: "string" },
            objectSource: {
              type: "string",
              enum: ["text", "image", "both"],
            },
            color: { anyOf: [{ type: "string" }, { type: "null" }] },
            size: {
              anyOf: [
                { type: "string", enum: ["small", "medium", "large"] },
                { type: "null" },
              ],
            },
          },
        },
        { type: "null" },
      ],
    },
  },
} as const;

const FALLBACK: AnalysisOutput = {
  intent: "new",
  patternType: "all_over",
  editTarget: "new",
  fabricTypeHint: null,
  referenceImageUsage: "none",
  tileLayout: {
    structure: "F",
    variation: null,
    motifs: [{ name: "abstract motif", color: null, colors: null }],
    backgroundColor: "white",
  },
  accentLayout: null,
};

const GENERATION_SPEC_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "tileLayout",
    "accentLayout",
    "motifInterpretation",
    "styleDirection",
    "referenceImageUsage",
  ],
  properties: {
    id: { type: "string" },
    tileLayout: ANALYSIS_JSON_SCHEMA.properties.tileLayout,
    accentLayout: ANALYSIS_JSON_SCHEMA.properties.accentLayout,
    motifInterpretation: {
      type: "object",
      additionalProperties: false,
      required: ["axis", "description", "colorEmphasis"],
      properties: {
        axis: {
          type: "string",
          enum: [
            "iconographic",
            "geometric_abstract",
            "textural_abstract",
            "symbolic_variation",
          ],
        },
        description: { type: "string" },
        colorEmphasis: {
          type: "string",
          enum: ["balanced", "dominant", "monochrome", "high_contrast"],
        },
      },
    },
    styleDirection: {
      type: "object",
      additionalProperties: false,
      required: ["medium", "aestheticVector", "density"],
      properties: {
        medium: { type: "string" },
        aestheticVector: { type: "string" },
        density: {
          type: "string",
          enum: ["minimal", "balanced", "maximal"],
        },
      },
    },
    referenceImageUsage: ANALYSIS_JSON_SCHEMA.properties.referenceImageUsage,
  },
} as const;

const DIVERSITY_PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["variants", "cohesionAnchor"],
  properties: {
    variants: {
      type: "array",
      minItems: DIVERSITY_VARIANT_COUNT,
      maxItems: DIVERSITY_VARIANT_COUNT,
      items: GENERATION_SPEC_JSON_SCHEMA,
    },
    cohesionAnchor: {
      type: "object",
      additionalProperties: false,
      required: ["fabricType", "backgroundColor", "motifKernel"],
      properties: {
        fabricType: { type: "string", enum: ["yarn_dyed", "printed"] },
        backgroundColor: { type: "string" },
        motifKernel: { type: "string" },
      },
    },
  },
} as const;

const REPEAT_KEYWORDS = ["배경만", "패턴만"];
const ACCENT_KEYWORDS = ["포인트만", "로고만", "이것만"];

function resolveEditTargetKeyword(message: string): EditTarget | null {
  if (matchKeyword(message, REPEAT_KEYWORDS)) return "repeat";
  if (matchKeyword(message, ACCENT_KEYWORDS)) return "accent";
  return null;
}

const createFallbackAccentLayout = (
  message: string,
): NonNullable<AnalysisOutput["accentLayout"]> => ({
  objectDescription: message.trim() || "accent motif",
  objectSource: "text",
  color: null,
  size: "medium",
});

const SYSTEM_PROMPT = `You analyze fabric pattern design requests and output structured JSON.

Output this exact schema:
{
  "intent": "new" | "edit",
  "patternType": "all_over" | "one_point",
  "editTarget": "repeat" | "accent" | "both" | "new",
  "fabricTypeHint": "yarn_dyed" | "printed" | null,
  "referenceImageUsage": "none" | "single_motif" | "composite_motif" | "multiple_motifs" | "repeat_and_accent",
  "tileLayout": {
    "structure": "H" | "F" | "Q" | "STRIPE" | "DOT" | "TOSSED" | "MEDALLION" | "GEOMETRIC",
    "variation": "rotation" | "color" | "different_motif" | "stripe_classic_diagonal" | "stripe_multi_width" | "stripe_regimental" | "stripe_textured" | "stripe_dotted" | "dot_micro" | "dot_pin" | "tossed_scattered" | "medallion_classic" | "geometric_diamond" | "geometric_check" | "geometric_herringbone" | null,
    "motifs": [{ "name": string, "color"?: string, "colors"?: [string, string] }],
    "backgroundColor": string
  },
  "accentLayout": {
    "objectDescription": string,
    "objectSource": "text" | "image" | "both",
    "color"?: string,
    "size"?: "small" | "medium" | "large"
  } | null
}

Structure rules:
- H: 1 motif centered. Use for "심플", "깔끔", "포인트".
- F (default): 2 identical motifs diagonal (upper-left + lower-right).
- Q-rotation: 4 motifs same shape, different rotation. Use for "회전", "돌아가는".
- Q-color: 4 motifs same shape, 2 colors alternating diagonally. Use for "두 가지 색".
- Q-different_motif: 4 motifs, 2 types alternating. Use when 2 distinct motifs named.
- STRIPE: diagonal necktie stripe patterns. Use for "스트라이프", "사선", "넥타이 기본", "클래식 타이".
- STRIPE/stripe_multi_width: use when the user asks for different stripe colors or widths.
- STRIPE/stripe_regimental: use for "레지멘탈" or classic formal stripe ties.
- STRIPE/stripe_textured: use for "트윌", "자가드", "질감이 다른 줄", or stripe bands with different fabric treatments.
- STRIPE/stripe_dotted: use for "줄 안에 점", "도트 스트라이프", or stripe bands containing dots/pindots.
- DOT: use for "도트", "핀도트"; prefer dot_micro unless the user explicitly asks for very tiny pin dots.
- TOSSED: use for "흩뿌린", "랜덤", "자연스럽게", or scattered motif repeats.
- MEDALLION: use for "메달리온", "작은 엠블럼 반복", or classic ornamental tie repeats.
- GEOMETRIC: use for "다이아", "체커", "헤링본", "기하학"; choose the matching geometric variation.
- one_point: repeat tile as background + single accent object at center.
- accentLayout is non-null only when patternType is "one_point".

Reference image usage rules:
- Use "none" when there are no useful attached reference images.
- Use "single_motif" when one attached image should become the repeated motif.
- Use "composite_motif" when multiple attached images should be combined into one motif.
- Use "multiple_motifs" when multiple attached images should remain separate alternating motifs.
- Use "repeat_and_accent" when one image is for the repeated background pattern and another image is for a one-point accent.
- Infer from wording; do not choose solely by image count.`;

const DIVERSITY_SYSTEM_PROMPT = `You are a senior textile designer for ESSE SION, a luxury necktie atelier.

Given the user's request and the base analysis, produce exactly 4 distinct GenerationSpecs for a controlled diversity image bundle.

Hard constraints:
- Keep every variant production-viable for a 1024x1024 repeat tile.
- Keep the same fabric family, background color, and motif kernel for collection cohesion.
- Preserve yarn-dyed or printed fabric constraints from the base analysis.
- Do not invent a server-side renderer, post-processing step, or model switch.

Diversity rules:
- The 4 variants must use the four motifInterpretation.axis values exactly once each.
- Each variant must differ on at least three of these dimensions: motif interpretation, style medium, tile layout, density, color emphasis.
- Prefer at least 2 STRIPE variants in the bundle because neckties are stripe-heavy, unless the user explicitly requested dot, scattered, medallion, or geometric-only output.
- When using STRIPE variants, vary the stripe subtype: classic diagonal, multi-width, regimental, textured, or dotted.
- Keep referenceImageUsage compatible with the base analysis and attached image count.
- Return JSON matching the provided schema only.`;

function resolveMotifKernel(
  analysis: AnalysisOutput,
  req: TileGenerationRequest,
) {
  const motifNames = analysis.tileLayout.motifs
    .map((motif) => motif.name.trim())
    .filter((name) => name.length > 0);
  if (motifNames.length > 0) return motifNames.join(", ");
  return req.userMessage.trim() || "abstract motif";
}

function createFallbackVariant(
  baseAnalysis: AnalysisOutput,
  index: number,
): GenerationSpec {
  const axes = [
    "iconographic",
    "geometric_abstract",
    "textural_abstract",
    "symbolic_variation",
  ] as const;
  const mediums = [
    "classic diagonal stripe textile",
    "mixed fabric stripe textile",
    "refined tonal textile",
    "geometric luxury tie textile",
  ] as const;
  const variationsByStructure: Partial<
    Record<TileStructure, readonly NonNullable<TileVariation>[]>
  > = {
    H: [],
    F: [],
    Q: ["different_motif", "rotation", "color"],
    STRIPE: [
      "stripe_classic_diagonal",
      "stripe_textured",
      "stripe_multi_width",
      "stripe_regimental",
      "stripe_dotted",
    ],
    DOT: ["dot_micro", "dot_pin"],
    TOSSED: ["tossed_scattered"],
    MEDALLION: ["medallion_classic"],
    GEOMETRIC: [
      "geometric_diamond",
      "geometric_check",
      "geometric_herringbone",
    ],
  };
  const crossFamilyFallbackLayouts = [
    { structure: "STRIPE", variation: "stripe_classic_diagonal" },
    { structure: "STRIPE", variation: "stripe_textured" },
    { structure: "DOT", variation: "dot_micro" },
    { structure: "GEOMETRIC", variation: "geometric_diamond" },
  ] as const;
  const baseStructure = baseAnalysis.tileLayout.structure;
  const familyVariations = variationsByStructure[baseStructure];
  const fallbackLayout =
    familyVariations !== undefined
      ? {
          structure: baseStructure,
          variation:
            familyVariations[index % Math.max(familyVariations.length, 1)] ??
            baseAnalysis.tileLayout.variation,
        }
      : (crossFamilyFallbackLayouts[index] ?? crossFamilyFallbackLayouts[0]);

  return {
    id: `variant_${index + 1}`,
    tileLayout: {
      ...structuredClone(baseAnalysis.tileLayout),
      structure: fallbackLayout.structure,
      variation: fallbackLayout.variation,
    },
    accentLayout: baseAnalysis.accentLayout
      ? structuredClone(baseAnalysis.accentLayout)
      : null,
    motifInterpretation: {
      axis: axes[index] ?? "iconographic",
      description:
        index === 0
          ? `Preserve the requested ${fallbackLayout.structure} layout family while refining the primary motif.`
          : `Reinterpret the same motif within the ${fallbackLayout.structure} layout family while preserving tie-pattern usability.`,
      colorEmphasis: "balanced",
    },
    styleDirection: {
      medium: mediums[index] ?? "clean textile illustration",
      aestheticVector: "ESSE SION restrained luxury necktie pattern",
      density: "balanced",
    },
    referenceImageUsage: baseAnalysis.referenceImageUsage,
  };
}

export function createFallbackDiversityPlan(
  req: TileGenerationRequest,
  baseAnalysis: AnalysisOutput,
  fabricType: FabricType,
): DiversityPlan {
  return {
    baseAnalysis,
    variants: Array.from({ length: DIVERSITY_VARIANT_COUNT }, (_, index) =>
      createFallbackVariant(baseAnalysis, index),
    ),
    cohesionAnchor: {
      fabricType,
      backgroundColor: baseAnalysis.tileLayout.backgroundColor,
      motifKernel: resolveMotifKernel(baseAnalysis, req),
    },
  };
}

function normalizeDiversityPlan(
  req: TileGenerationRequest,
  baseAnalysis: AnalysisOutput,
  fabricType: FabricType,
  raw: Omit<DiversityPlan, "baseAnalysis">,
): DiversityPlan {
  if (!Array.isArray(raw.variants) || raw.variants.length !== 4) {
    throw new Error("Diversity plan must contain exactly 4 variants");
  }
  const axes = raw.variants.map((variant) => variant.motifInterpretation.axis);
  const duplicateAxes = axes.filter(
    (axis, index) => axes.indexOf(axis) !== index,
  );
  if (duplicateAxes.length > 0) {
    throw new Error(
      `Diversity plan variants must use unique motifInterpretation.axis values: ${duplicateAxes.join(", ")}`,
    );
  }

  return {
    baseAnalysis,
    variants: raw.variants.map((variant, index) => ({
      ...variant,
      id: variant.id || `variant_${index + 1}`,
      accentLayout:
        baseAnalysis.patternType === "one_point"
          ? (variant.accentLayout ?? baseAnalysis.accentLayout)
          : null,
      referenceImageUsage:
        variant.referenceImageUsage ?? baseAnalysis.referenceImageUsage,
    })),
    cohesionAnchor: {
      fabricType,
      backgroundColor:
        raw.cohesionAnchor?.backgroundColor ??
        baseAnalysis.tileLayout.backgroundColor,
      motifKernel:
        raw.cohesionAnchor?.motifKernel ??
        resolveMotifKernel(baseAnalysis, req),
    },
  };
}

export async function analyzeIntent(
  req: TileGenerationRequest,
): Promise<AnalysisOutput> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY not set");

  const editTargetOverride = resolveEditTargetKeyword(req.userMessage);
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `Attached reference image count: ${req.attachedImageUrls.length}. Use this count only as context; infer referenceImageUsage from the user's wording.`,
    },
    ...req.conversationHistory,
    { role: "user", content: req.userMessage },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tile_analysis",
            strict: true,
            schema: ANALYSIS_JSON_SCHEMA,
          },
        },
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.error("analysis_model error:", await response.text());
      return structuredClone(FALLBACK);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    if (message?.refusal) {
      console.error("analysis_model refusal:", message.refusal);
      return structuredClone(FALLBACK);
    }

    const content = message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      console.error("analysis_model empty content:", content ?? null);
      return structuredClone(FALLBACK);
    }

    const raw = JSON.parse(content) as AnalysisOutput;

    if (editTargetOverride) {
      raw.intent = "edit";
      raw.editTarget = editTargetOverride;
      if (editTargetOverride === "accent") {
        raw.patternType = "one_point";
        raw.accentLayout ??= createFallbackAccentLayout(req.userMessage);
      }
    }

    return raw;
  } catch (error) {
    console.error("analyzeIntent fallback:", error);
    return structuredClone(FALLBACK);
  }
}

export async function planDiversity(
  req: TileGenerationRequest,
  baseAnalysis: AnalysisOutput,
  fabricType: FabricType,
): Promise<DiversityPlan> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY not set");

  const fallback = () =>
    createFallbackDiversityPlan(req, baseAnalysis, fabricType);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [
          { role: "system", content: DIVERSITY_SYSTEM_PROMPT },
          {
            role: "system",
            content: `Attached reference image count: ${req.attachedImageUrls.length}.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              userMessage: req.userMessage,
              selectedColors: req.selectedColors,
              fabricType,
              baseAnalysis,
            }),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tile_diversity_plan",
            strict: true,
            schema: DIVERSITY_PLAN_JSON_SCHEMA,
          },
        },
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      console.error("diversity_plan error:", await response.text());
      return fallback();
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    if (message?.refusal) {
      console.error("diversity_plan refusal:", message.refusal);
      return fallback();
    }

    const content = message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      console.error("diversity_plan empty content:", content ?? null);
      return fallback();
    }

    return normalizeDiversityPlan(
      req,
      baseAnalysis,
      fabricType,
      JSON.parse(content) as Omit<DiversityPlan, "baseAnalysis">,
    );
  } catch (error) {
    console.error("planDiversity fallback:", error);
    return fallback();
  }
}
