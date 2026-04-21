export type RenderCapability =
  | "woven_texture_render"
  | "printed_surface_render";

export type FabricMethod = "yarn-dyed" | "print";

export const FABRIC_METHOD_TO_CAPABILITY: Record<
  FabricMethod,
  RenderCapability
> = {
  "yarn-dyed": "woven_texture_render",
  print: "printed_surface_render",
};

export interface RenderCapabilityPreset {
  id: RenderCapability;
  fabricLineShort: string;
  fabricConstruction: string[];
  patternExtraHint: string | null;
  referenceLabel: string;
  img2imgStrength: number;
  controlNetConditioningScale: number;
}

export const RENDER_CAPABILITY_PRESETS: Record<
  RenderCapability,
  RenderCapabilityPreset
> = {
  woven_texture_render: {
    id: "woven_texture_render",
    fabricLineShort:
      "Render the surface as woven silk with visible thread interlacing, a soft natural sheen, and subtle fabric weave.",
    fabricConstruction: [
      "Fabric construction: yarn-dyed woven silk.",
      "The pattern is formed entirely by interwoven threads — visible weave structure, subtle textile depth, and a genuine woven repeat.",
      "Each motif appears as a single solid thread color against the background, rendered as a clean silhouette.",
      "The pattern emerges from the thread interlacing itself, not from printing.",
      "The surface has the tactile, slightly textured quality of woven jacquard silk.",
    ],
    patternExtraHint:
      "Render each motif as a single-color silhouette only — no inner color variation or detail.",
    referenceLabel: "yarn-dyed woven",
    img2imgStrength: 0.3,
    controlNetConditioningScale: 0.65,
  },
  printed_surface_render: {
    id: "printed_surface_render",
    fabricLineShort:
      "Render the surface as printed silk with crisp printed color on a smooth lustrous fabric and no thread texture.",
    fabricConstruction: [
      "Fabric construction: printed silk.",
      "The pattern is screen-printed or digitally printed directly onto the fabric surface — crisp edges, vibrant colors, and surface-applied graphics.",
      "Multi-color details within each motif are fully supported: crisp outlines, gradients, fine inner details, and multiple colors per motif.",
      "The surface is smooth and lustrous, with the clean flat quality of printed silk.",
      "No thread texture, no weave structure, no fiber depth — the surface is as flat and smooth as coated paper.",
    ],
    patternExtraHint: null,
    referenceLabel: "printed",
    img2imgStrength: 0.28,
    controlNetConditioningScale: 0.65,
  },
};

export function resolveRenderCapability(
  fabricMethod: string | null | undefined,
): RenderCapabilityPreset | null {
  if (!fabricMethod) {
    return null;
  }

  if (!(fabricMethod in FABRIC_METHOD_TO_CAPABILITY)) {
    return null;
  }

  const capability = FABRIC_METHOD_TO_CAPABILITY[fabricMethod as FabricMethod];
  return capability ? RENDER_CAPABILITY_PRESETS[capability] : null;
}
