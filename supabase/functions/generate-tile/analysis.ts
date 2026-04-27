import type {
  AnalysisOutput,
  EditTarget,
  TileGenerationRequest,
} from "./types.ts";
import { matchKeyword } from "./fabric-type-resolver.ts";

const ANALYSIS_MODEL = "gpt-4o-2024-08-06";

const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "intent",
    "patternType",
    "editTarget",
    "fabricTypeHint",
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
    tileLayout: {
      type: "object",
      additionalProperties: false,
      required: ["structure", "variation", "motifs", "backgroundColor"],
      properties: {
        structure: { type: "string", enum: ["H", "F", "Q"] },
        variation: {
          anyOf: [
            { type: "string", enum: ["rotation", "color", "different_motif"] },
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
  tileLayout: {
    structure: "F",
    variation: null,
    motifs: [{ name: "abstract motif", color: null, colors: null }],
    backgroundColor: "white",
  },
  accentLayout: null,
};

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
  "tileLayout": {
    "structure": "H" | "F" | "Q",
    "variation": "rotation" | "color" | "different_motif" | null,
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
- one_point: repeat tile as background + single accent object at center.
- accentLayout is non-null only when patternType is "one_point".`;

export async function analyzeIntent(
  req: TileGenerationRequest,
): Promise<AnalysisOutput> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY not set");

  const editTargetOverride = resolveEditTargetKeyword(req.userMessage);
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
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
