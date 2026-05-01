import type {
  AccentLayout,
  FabricType,
  GenerationSpec,
  ReferenceImageUsage,
  TileLayout,
} from "./types.ts";
import {
  ACCENT_IMAGE_TEMPLATE,
  ACCENT_TEXT_TEMPLATE,
  DOT_MICRO_TEMPLATE,
  DOT_PIN_TEMPLATE,
  F_TEMPLATE,
  GEOMETRIC_CHECK_TEMPLATE,
  GEOMETRIC_DIAMOND_TEMPLATE,
  GEOMETRIC_HERRINGBONE_TEMPLATE,
  H_TEMPLATE,
  MEDALLION_CLASSIC_TEMPLATE,
  PRINTED_FABRIC_BLOCK,
  Q_COLOR_TEMPLATE,
  Q_DIFFERENT_MOTIF_TEMPLATE,
  Q_ROTATION_TEMPLATE,
  SEAMLESS_SUFFIX,
  STRIPE_CLASSIC_DIAGONAL_TEMPLATE,
  STRIPE_DOTTED_TEMPLATE,
  STRIPE_MULTI_WIDTH_TEMPLATE,
  STRIPE_REGIMENTAL_TEMPLATE,
  STRIPE_TEXTURED_TEMPLATE,
  TOSSED_SCATTERED_TEMPLATE,
  YARN_DYED_FABRIC_BLOCK,
} from "./prompt-templates.ts";

const SIZE_RATIO_MAP: Record<"small" | "medium" | "large", number> = {
  small: 30,
  medium: 45,
  large: 60,
};

const MAX_COMPOSITE_REFERENCE_IMAGES = 5;

function makeFabricBlock(
  fabricType: FabricType,
  withSeamless: boolean,
): string {
  const base =
    fabricType === "yarn_dyed" ? YARN_DYED_FABRIC_BLOCK : PRINTED_FABRIC_BLOCK;
  return withSeamless ? `${base}\n${SEAMLESS_SUFFIX}` : base;
}

function selectRepeatTemplate(layout: TileLayout): string {
  if (layout.structure === "H") return H_TEMPLATE;
  if (layout.structure === "F") return F_TEMPLATE;
  if (layout.structure === "Q") {
    if (layout.variation === "rotation") return Q_ROTATION_TEMPLATE;
    if (layout.variation === "color") return Q_COLOR_TEMPLATE;
    return Q_DIFFERENT_MOTIF_TEMPLATE;
  }
  if (layout.structure === "STRIPE") {
    if (layout.variation === "stripe_multi_width") {
      return STRIPE_MULTI_WIDTH_TEMPLATE;
    }
    if (layout.variation === "stripe_regimental") {
      return STRIPE_REGIMENTAL_TEMPLATE;
    }
    if (layout.variation === "stripe_textured") return STRIPE_TEXTURED_TEMPLATE;
    if (layout.variation === "stripe_dotted") return STRIPE_DOTTED_TEMPLATE;
    return STRIPE_CLASSIC_DIAGONAL_TEMPLATE;
  }
  if (layout.structure === "DOT") {
    if (layout.variation === "dot_pin") return DOT_PIN_TEMPLATE;
    return DOT_MICRO_TEMPLATE;
  }
  if (layout.structure === "TOSSED") return TOSSED_SCATTERED_TEMPLATE;
  if (layout.structure === "MEDALLION") return MEDALLION_CLASSIC_TEMPLATE;
  if (layout.structure === "GEOMETRIC") {
    if (layout.variation === "geometric_check") return GEOMETRIC_CHECK_TEMPLATE;
    if (layout.variation === "geometric_herringbone") {
      return GEOMETRIC_HERRINGBONE_TEMPLATE;
    }
  }
  return GEOMETRIC_DIAMOND_TEMPLATE;
}

function buildReferenceInstruction(
  usage: ReferenceImageUsage,
  referenceImageCount: number,
): string {
  if (referenceImageCount <= 0 || usage === "none") return "";
  if (usage === "single_motif") {
    return "Reference image rule (critical):\n- Use Image 1 as the motif reference.\n- Reproduce the main object from Image 1 as the repeated motif, simplifying only as needed for clean tie fabric rendering.\n\n";
  }
  if (usage === "composite_motif") {
    const end = Math.min(referenceImageCount, MAX_COMPOSITE_REFERENCE_IMAGES);
    if (end === 1) {
      return "Reference image rule (critical):\n- Use Image 1 as the unified motif reference.\n- The repeated motif must look like a single designed emblem, not separate pasted images.\n\n";
    }
    return `Reference image rule (critical):\n- Combine Images 1-${end} into one unified motif.\n- The repeated motif must look like a single designed emblem, not separate pasted images.\n\n`;
  }
  if (usage === "multiple_motifs") {
    if (referenceImageCount < 2) {
      return "Reference image rule (critical):\n- Use Image 1 as the repeated motif reference.\n- Reproduce the main object from Image 1 as the motif, simplifying only as needed for clean tie fabric rendering.\n\n";
    }
    return "Reference image rule (critical):\n- Use Image 1 as MOTIF_A.\n- Use Image 2 as MOTIF_B.\n- Keep the two motifs visually distinct and alternate them according to the placement rule.\n\n";
  }
  if (usage === "repeat_and_accent" && referenceImageCount < 2) {
    return "Reference image rule (critical):\n- Use Image 1 as the repeat-pattern motif reference.\n\n";
  }
  return "Reference image rule (critical):\n- Use Image 1 as the repeat-pattern motif reference.\n- Reserve Image 2 for the one-point accent when an accent tile is generated.\n\n";
}

function buildVariantInstruction(
  variantInstruction: string | GenerationSpec | null | undefined,
): string {
  if (!variantInstruction) return "";
  if (typeof variantInstruction === "string") {
    return `Variant direction:\n- ${variantInstruction}\n\n`;
  }

  return [
    "Variant direction:",
    `- Motif interpretation: ${variantInstruction.motifInterpretation.axis}; ${variantInstruction.motifInterpretation.description}.`,
    `- Style direction: ${variantInstruction.styleDirection.medium}; ${variantInstruction.styleDirection.aestheticVector}.`,
    `- Composition density: ${variantInstruction.styleDirection.density}.`,
    `- Color emphasis: ${variantInstruction.motifInterpretation.colorEmphasis}.`,
    "",
  ].join("\n");
}

function resolveMotifColors(
  motif: TileLayout["motifs"][number] | { color?: string | null },
): [string, string] {
  if ("colors" in motif && motif.colors) {
    return motif.colors;
  }

  return [
    motif.color ?? "the motif primary color",
    "a complementary motif color",
  ];
}

export function buildRepeatPrompt(
  layout: TileLayout,
  fabricType: FabricType,
  referenceImageUsage: ReferenceImageUsage = "none",
  referenceImageCount = 0,
  variantInstruction?: string | GenerationSpec,
): string {
  const firstMotif = layout.motifs[0] ?? { name: "abstract motif" };
  const [colorA, colorB] = resolveMotifColors(firstMotif);
  return (
    buildReferenceInstruction(referenceImageUsage, referenceImageCount) +
    buildVariantInstruction(variantInstruction) +
    selectRepeatTemplate(layout)
  )
    .replace(/{FABRIC_BLOCK}/g, makeFabricBlock(fabricType, true))
    .replace(/{BG}/g, layout.backgroundColor)
    .replace(/{MOTIF}/g, firstMotif.name)
    .replace(/{COLOR_A}/g, colorA)
    .replace(/{COLOR_B}/g, colorB)
    .replace(/{MOTIF_A}/g, firstMotif.name)
    .replace(/{MOTIF_B}/g, layout.motifs[1]?.name ?? firstMotif.name);
}

export function buildAccentPrompt(
  accentLayout: AccentLayout,
  backgroundColor: string,
  fabricType: FabricType,
  repeatTileReferenceUrl: string,
  objectReferenceImageUrls: string[],
): { prompt: string; referenceImageUrls: string[] } {
  const isImageBased = accentLayout.objectSource !== "text";
  const fabric = makeFabricBlock(fabricType, true);
  const sizeRatio = SIZE_RATIO_MAP[accentLayout.size ?? "medium"];

  let template = isImageBased ? ACCENT_IMAGE_TEMPLATE : ACCENT_TEXT_TEMPLATE;
  template = template
    .replace(/{FABRIC_BLOCK}/g, fabric)
    .replace(/{BG}/g, backgroundColor)
    .replace("{SIZE_RATIO}", String(sizeRatio))
    .replace("{OBJECT_DESC}", accentLayout.objectDescription);

  if (isImageBased) {
    const objectReferenceInstruction =
      objectReferenceImageUrls.length > 0
        ? "Use Image 2 as the object reference and reproduce it as a single decorative element at the exact geometric center of the tile."
        : "Create the central decorative object from the object description at the exact geometric center of the tile.";
    const extra =
      accentLayout.objectSource === "both"
        ? `- ${accentLayout.objectDescription}\n`
        : "";
    template = template
      .replace("{OBJECT_REFERENCE_INSTRUCTION}", objectReferenceInstruction)
      .replace("{EXTRA_INSTRUCTION}", extra);
  } else {
    const colorLine = accentLayout.color
      ? `- Object color: ${accentLayout.color}.\n`
      : "";
    template = template.replace("{COLOR_LINE}", colorLine);
  }

  return {
    prompt: template,
    referenceImageUrls: [
      repeatTileReferenceUrl,
      ...(isImageBased ? objectReferenceImageUrls : []),
    ],
  };
}
