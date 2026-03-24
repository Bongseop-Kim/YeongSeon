export const PRODUCT_CATEGORIES = [
  "3fold",
  "sfolderato",
  "knit",
  "bowtie",
] as const;

export const PRODUCT_COLORS = [
  "black",
  "navy",
  "gray",
  "wine",
  "blue",
  "brown",
  "beige",
  "silver",
] as const;

export const PRODUCT_PATTERNS = [
  "solid",
  "stripe",
  "dot",
  "check",
  "paisley",
] as const;

export const PRODUCT_MATERIALS = [
  "silk",
  "cotton",
  "polyester",
  "wool",
] as const;

export const CATEGORY_FILTER_OPTIONS = [
  { label: "전체", value: "" },
  ...PRODUCT_CATEGORIES.map((v) => ({ label: v, value: v })),
];

export interface AdminProductListItem {
  id: number;
  image: string | null;
  code: string | null;
  name: string;
  category: string;
  color: string;
  material: string;
  price: number;
  stock: number | null;
  optionStockTotal: number | null;
  optionCount: number;
}

export interface AdminProductOption {
  name: string;
  additionalPrice: number;
  stock: number | null;
}
