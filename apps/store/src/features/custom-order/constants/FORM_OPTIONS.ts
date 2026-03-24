export const INTERLINING_TYPES = [{ value: "WOOL", label: "울 심지" }] as const;

export const INTERLINING_THICKNESS = [
  { value: "THIN", label: "얇음" },
  { value: "THICK", label: "두꺼움" },
] as const;

export const QUANTITY_CONFIG = {
  min: 4,
} as const;

export const TIE_WIDTH_CONFIG = {
  min: 6,
  max: 12,
  step: 0.5,
} as const;
