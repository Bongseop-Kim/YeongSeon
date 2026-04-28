import type {
  AccentLayout,
  FabricType,
  ReferenceImageUsage,
  TileLayout,
} from "./types.ts";
import {
  ACCENT_IMAGE_TEMPLATE,
  ACCENT_TEXT_TEMPLATE,
  F_TEMPLATE,
  H_TEMPLATE,
  PRINTED_FABRIC_BLOCK,
  Q_COLOR_TEMPLATE,
  Q_DIFFERENT_MOTIF_TEMPLATE,
  Q_ROTATION_TEMPLATE,
  SEAMLESS_SUFFIX,
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
  if (layout.variation === "rotation") return Q_ROTATION_TEMPLATE;
  if (layout.variation === "color") return Q_COLOR_TEMPLATE;
  return Q_DIFFERENT_MOTIF_TEMPLATE;
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
): string {
  const firstMotif = layout.motifs[0] ?? { name: "abstract motif" };
  const [colorA, colorB] = resolveMotifColors(firstMotif);
  return (
    buildReferenceInstruction(referenceImageUsage, referenceImageCount) +
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
  attachedImageUrls: string[],
): { prompt: string; referenceImageUrls: string[] } {
  const isImageBased = accentLayout.objectSource !== "text";
  const fabric = makeFabricBlock(fabricType, false);
  const sizeRatio = SIZE_RATIO_MAP[accentLayout.size ?? "medium"];

  let template = isImageBased ? ACCENT_IMAGE_TEMPLATE : ACCENT_TEXT_TEMPLATE;
  template = template
    .replace(/{FABRIC_BLOCK}/g, fabric)
    .replace(/{BG}/g, backgroundColor)
    .replace("{SIZE_RATIO}", String(sizeRatio))
    .replace("{OBJECT_DESC}", accentLayout.objectDescription);

  if (isImageBased) {
    const extra =
      accentLayout.objectSource === "both"
        ? `- ${accentLayout.objectDescription}\n`
        : "";
    template = template.replace("{EXTRA_INSTRUCTION}", extra);
  } else {
    const colorLine = accentLayout.color
      ? `- Object color: ${accentLayout.color}.\n`
      : "";
    template = template.replace("{COLOR_LINE}", colorLine);
  }

  return {
    prompt: template,
    referenceImageUrls: isImageBased ? attachedImageUrls : [],
  };
}
