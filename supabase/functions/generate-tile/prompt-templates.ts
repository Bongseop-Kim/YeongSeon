export const YARN_DYED_FABRIC_BLOCK = `Fabric rendering (critical):
- Entire surface is realistic yarn-dyed tie silk jacquard fabric, top-down flat view.
- Visible woven warp and weft threads with subtle natural sheen.
- Motifs appear as woven into the fabric structure, not printed on top.
- The pattern emerges from the weave itself, with thread-level texture visible on both the motifs and the background.`;

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
Flat 2D top-down view, no shadow, no text, no border.`;

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
