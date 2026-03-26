export const SCALE_META = {
  large: {
    stripeRange: "8-9",
    motifRange: "8-9",
    stripeDescription:
      "largest scale of the three options with bold, widely spaced stripes and the largest repeat.",
    motifDescription:
      "largest scale of the three options with bold, widely spaced motifs and the largest repeat.",
  },
  medium: {
    stripeRange: "12-13",
    motifRange: "12-13",
    stripeDescription:
      "fine classic stripes with a tighter repeat than the large option.",
    motifDescription:
      "fine and dense motifs with a tighter repeat than the large option.",
  },
  small: {
    stripeRange: "16-17",
    motifRange: "16-17",
    stripeDescription:
      "ultra-fine pinstripes that are extremely narrow and tightly packed.",
    motifDescription:
      "ultra-fine micro motifs with a very dense repeat across the full surface.",
  },
} as const;
