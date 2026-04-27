import type { AccentLayout, FabricType, TileLayout } from "./types.ts";
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
): string {
  const firstMotif = layout.motifs[0] ?? { name: "abstract motif" };
  const [colorA, colorB] = resolveMotifColors(firstMotif);
  return selectRepeatTemplate(layout)
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
  attachedImageUrl: string | null,
): { prompt: string; referenceImageUrl?: string } {
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
    referenceImageUrl:
      isImageBased && attachedImageUrl ? attachedImageUrl : undefined,
  };
}
