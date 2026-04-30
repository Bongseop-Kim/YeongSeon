export const YARN_DYED_FABRIC_BLOCK = `Fabric rendering (critical):
- Entire surface is realistic yarn-dyed tie silk jacquard fabric, top-down flat view.
- Visible woven warp and weft threads with subtle natural sheen.
- Motifs appear as woven into the fabric structure, not printed on top.
- The pattern emerges from the weave itself, with thread-level texture visible on both the motifs and the background.

Yarn-dyed weaving constraints:
- Keep the original design mostly intact, but simplify details that are too fine to weave.
- Thicken all fine lines and small details so no element appears too thin for woven jacquard fabric.
- Prefer 2-3 solid thread colors for the motif and background unless the design clearly requires more.
- Render the result as yarn-dyed woven silk with visible interlaced threads, not printed ink.`;

export const PRINTED_FABRIC_BLOCK = `Fabric rendering (critical):
- Entire surface is printed tie silk fabric, top-down flat view.
- Smooth matte surface with flat color fields.
- Motifs appear as ink printed on top of the silk base, with crisp edges and uniform color fill.
- No thread-level texture within the motifs or background.
- Very subtle fabric base grain may be visible but must remain uniform across the tile.`;

export const SEAMLESS_SUFFIX = `- The fabric surface must tile seamlessly on all four edges:
  left edge matches right edge, top edge matches bottom edge.
- No directional weave/grain bias, no visible texture seam at any edge when the tile is repeated.`;

export const H_TEMPLATE = `Square tile 1024x1024 with exactly 1 {MOTIF} on plain {BG} tie silk fabric.

Placement rule (critical):
- The {MOTIF} is placed at the exact geometric center of the tile.
- Equal margin on all four sides (top margin = bottom margin = left margin = right margin).
- No other elements anywhere in the tile, including corners and edges.

{FABRIC_BLOCK}

Motif size: about 45% of the tile width.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const F_TEMPLATE = `Square tile 1024x1024 with exactly 2 identical {MOTIF} on plain {BG} tie silk fabric.

Placement rule (critical):
- Divide the tile into a 2x2 invisible grid (four equal quadrants).
- Place one {MOTIF} at the exact center of the upper-left quadrant.
- Place one {MOTIF} at the exact center of the lower-right quadrant.
- Upper-right and lower-left quadrants are completely empty.
- Each motif is centered within its quadrant with equal margin on all four sides of that quadrant.

{FABRIC_BLOCK}

Each motif size: about 35% of the tile width.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const Q_ROTATION_TEMPLATE = `Square tile 1024x1024 with exactly 4 {MOTIF} on plain {BG} tie silk fabric.

Placement rule (critical):
- Divide the tile into a 2x2 invisible grid (four equal quadrants).
- Place one {MOTIF} at the exact center of each quadrant.
- Each motif is centered within its quadrant, with equal margin on all four sides of its quadrant.
- Distance from any motif to the tile edge equals half the distance between two adjacent motifs.

Rotation rule (critical):
- All 4 motifs are the same motif (identical shape, identical size, identical color).
- Upper-left quadrant: rotated 0 degrees.
- Upper-right quadrant: rotated 90 degrees clockwise.
- Lower-right quadrant: rotated 180 degrees.
- Lower-left quadrant: rotated 270 degrees clockwise.

{FABRIC_BLOCK}

Each motif size: about 35% of the tile width.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const Q_COLOR_TEMPLATE = `Square tile 1024x1024 with exactly 4 {MOTIF} on plain {BG} tie silk fabric.

Placement rule (critical):
- Divide the tile into a 2x2 invisible grid (four equal quadrants).
- Place one {MOTIF} at the exact center of each quadrant.
- Each motif is centered within its quadrant, with equal margin on all four sides of its quadrant.
- Distance from any motif to the tile edge equals half the distance between two adjacent motifs.

Color rule (critical):
- All 4 motifs are the same shape, same size, same orientation.
- Upper-left and lower-right: {COLOR_A}.
- Upper-right and lower-left: {COLOR_B}.

{FABRIC_BLOCK}

Each motif size: about 35% of the tile width.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const Q_DIFFERENT_MOTIF_TEMPLATE = `Square tile 1024x1024 with exactly 4 motifs on plain {BG} tie silk fabric.

Placement rule (critical):
- Divide the tile into a 2x2 invisible grid (four equal quadrants).
- Upper-left quadrant: one {MOTIF_A} at the exact center.
- Lower-right quadrant: one {MOTIF_A} at the exact center (identical to upper-left).
- Upper-right quadrant: one {MOTIF_B} at the exact center.
- Lower-left quadrant: one {MOTIF_B} at the exact center (identical to upper-right).
- Each motif is centered within its quadrant with equal margin on all four sides of that quadrant.
- Distance from any motif to the tile edge equals half the distance between two adjacent motifs.

{FABRIC_BLOCK}

Each motif size: about 30% of the tile width.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const STRIPE_CLASSIC_DIAGONAL_TEMPLATE = `Square tile 1024x1024 with a classic diagonal necktie stripe pattern on {BG} tie silk fabric.

Stripe rule (critical):
- Create clean repeating diagonal stripes running top-left to bottom-right diagonal.
- Use {MOTIF} as the stripe character or color inspiration, not as a separate centered icon.
- Use 2-3 restrained necktie colors, including {BG}, {COLOR_A}, and {COLOR_B} when appropriate.
- Keep stripe spacing regular and production-ready, with no isolated motifs or empty quadrants.
- The diagonal stripe rhythm must continue seamlessly across all four tile edges.

{FABRIC_BLOCK}

Classic necktie scale: medium-width diagonal bands, crisp edges, balanced negative space.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const STRIPE_MULTI_WIDTH_TEMPLATE = `Square tile 1024x1024 with a multi-width diagonal necktie stripe pattern on {BG} tie silk fabric.

Stripe rule (critical):
- Create repeating diagonal stripes running top-left to bottom-right diagonal.
- Mix broad primary stripes, medium secondary stripes, and very thin pinstripes.
- Use {MOTIF} only as color or decorative inspiration within the stripe system.
- Alternate stripe widths deliberately so the pattern feels like a luxury necktie, not a simple barcode.
- The stripe sequence must repeat seamlessly across all four tile edges.

{FABRIC_BLOCK}

Use {COLOR_A} for the dominant stripe family and {COLOR_B} for narrow accent lines when appropriate.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const STRIPE_REGIMENTAL_TEMPLATE = `Square tile 1024x1024 with a classic regimental diagonal necktie stripe pattern on {BG} tie silk fabric.

Stripe rule (critical):
- Create structured diagonal stripes running top-left to bottom-right diagonal.
- Use a repeating sequence of one broad main stripe, one narrow contrast stripe, and one fine pinline.
- Keep the rhythm crisp, formal, and conservative, suitable for a classic tie.
- Use {MOTIF} only as subtle color inspiration, not as a standalone motif.
- The regimental stripe sequence must tile seamlessly on all four edges.

{FABRIC_BLOCK}

Palette: refined {BG}, {COLOR_A}, and {COLOR_B}; avoid gradients and pictorial elements.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const STRIPE_TEXTURED_TEMPLATE = `Square tile 1024x1024 with a textured diagonal stripe necktie pattern on {BG} tie silk fabric.

Stripe rule (critical):
- Create repeating diagonal stripes running top-left to bottom-right diagonal.
- Vary the stripe treatment by band: one stripe woven twill, one stripe jacquard-like, one stripe smooth woven silk.
- Keep every stripe flat and integrated into the fabric surface; no raised shadow or 3D embossing.
- Use {MOTIF} only as subtle textile inspiration inside the stripe rhythm.
- The textured diagonal stripe sequence must repeat seamlessly across all four tile edges.

{FABRIC_BLOCK}

Texture contrast should be visible at thumbnail scale but remain elegant and tie-appropriate.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const STRIPE_DOTTED_TEMPLATE = `Square tile 1024x1024 with a diagonal stripe with internal pindot detail on {BG} tie silk fabric.

Stripe rule (critical):
- Create repeating diagonal stripes running top-left to bottom-right diagonal.
- Add tiny dots or pindots inside selected stripes only; keep other stripes clean.
- The dots must follow the diagonal stripe direction and stay contained inside stripe bands.
- Use {MOTIF} as dot or accent inspiration, not as a large standalone motif.
- The dotted stripe sequence must repeat seamlessly across all four tile edges.

{FABRIC_BLOCK}

Dot scale: tiny, regular, luxury tie pindot scale, visible in thumbnail without clutter.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const DOT_MICRO_TEMPLATE = `Square tile 1024x1024 with a refined micro-dot repeat on plain {BG} tie silk fabric.

Dot rule (critical):
- Fill the tile with tiny evenly spaced {MOTIF} dots or simple round dots.
- Keep dot scale small and dense enough for a luxury necktie thumbnail.
- Keep spacing consistent so the pattern tiles seamlessly on all four edges.
- No large centered motif, no diagonal quadrant layout, no extra decorations.

{FABRIC_BLOCK}

Dot size: about 3-5% of the tile width per dot cluster.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const DOT_PIN_TEMPLATE = `Square tile 1024x1024 with a classic pindot repeat on plain {BG} tie silk fabric.

Dot rule (critical):
- Create very small pinpoint dots in a precise regular repeat.
- Use {COLOR_A} or {MOTIF} color inspiration for the dots against {BG}.
- Keep the layout quiet, formal, and high-end.
- The pindot grid must tile seamlessly on all four edges.

{FABRIC_BLOCK}

Pindot scale: tiny and restrained, with generous background visible.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const TOSSED_SCATTERED_TEMPLATE = `Square tile 1024x1024 with a tossed scattered repeat of {MOTIF} on plain {BG} tie silk fabric.

Placement rule (critical):
- Scatter small {MOTIF} elements across the tile with varied rotation and spacing.
- Keep the distribution balanced and natural, avoiding obvious rows, columns, or a 2x2 grid.
- Motifs near tile edges must continue naturally when repeated.
- Keep each motif small and tie-appropriate; no oversized central object.

{FABRIC_BLOCK}

Motif size: about 12-18% of the tile width, repeated at varied angles.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const MEDALLION_CLASSIC_TEMPLATE = `Square tile 1024x1024 with a classic small medallion repeat on plain {BG} tie silk fabric.

Placement rule (critical):
- Create a regular repeat of small ornamental {MOTIF} medallions.
- Arrange medallions in a refined offset grid suitable for a classic necktie.
- Keep each medallion simplified, symmetric, and readable at thumbnail scale.
- The medallion repeat must tile seamlessly on all four edges.

{FABRIC_BLOCK}

Medallion size: about 18-24% of the tile width, with balanced spacing.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const GEOMETRIC_DIAMOND_TEMPLATE = `Square tile 1024x1024 with a geometric diamond repeat on plain {BG} tie silk fabric.

Geometry rule (critical):
- Create a small repeating diamond lattice or diamond-check pattern.
- Use {MOTIF} only as abstract shape inspiration inside the diamond geometry.
- Keep line weight and spacing consistent, refined, and tie-appropriate.
- The diamond repeat must tile seamlessly on all four edges.

{FABRIC_BLOCK}

Scale: small to medium geometric repeat, readable in an 80px thumbnail.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const GEOMETRIC_CHECK_TEMPLATE = `Square tile 1024x1024 with a refined small check repeat on plain {BG} tie silk fabric.

Geometry rule (critical):
- Create a tight repeating check or mini-grid pattern using {COLOR_A} and {COLOR_B} when appropriate.
- Keep the check scale small, formal, and suitable for necktie fabric.
- Avoid large squares, pictorial motifs, or empty quadrants.
- The check repeat must tile seamlessly on all four edges.

{FABRIC_BLOCK}

Scale: compact check pattern with crisp intersections.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const GEOMETRIC_HERRINGBONE_TEMPLATE = `Square tile 1024x1024 with a subtle geometric herringbone repeat on plain {BG} tie silk fabric.

Geometry rule (critical):
- Create a small repeating herringbone or broken-chevron textile pattern.
- Keep the pattern tonal and refined, using {MOTIF} only as abstract inspiration.
- Avoid large zigzags or high-contrast optical effects.
- The herringbone repeat must tile seamlessly on all four edges.

{FABRIC_BLOCK}

Scale: fine textile herringbone, visible but not overpowering.
Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const ACCENT_TEXT_TEMPLATE = `Square tile 1024x1024 on plain {BG} tie silk fabric.

Subject:
- {OBJECT_DESC}, placed at the exact geometric center of the tile.
- Object size: about {SIZE_RATIO}% of the tile width.
{COLOR_LINE}
Background:
- Plain {BG} covering the entire tile outside of the central object.
- No additional motifs, patterns, or decorations anywhere on the background.
- Background tone, brightness, and fabric treatment must match the repeat tile's background exactly.

{FABRIC_BLOCK}

Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;

export const ACCENT_IMAGE_TEMPLATE = `Square tile 1024x1024 on plain {BG} tie silk fabric.

Subject:
- Reproduce the attached reference image as a single decorative element at the exact geometric center of the tile.
{EXTRA_INSTRUCTION}- Object size: about {SIZE_RATIO}% of the tile width.

Background:
- Plain {BG} covering the entire tile outside of the central object.
- No additional motifs, patterns, or decorations anywhere on the background.
- Background tone, brightness, and fabric treatment must match the repeat tile's background exactly.

{FABRIC_BLOCK}

Flat 2D top-down view, no shadow, no text, no border, no additional decoration.`;
