import type {
  ProductCategory,
  ProductColor,
  ProductMaterial,
  ProductPattern,
} from "@yeongseon/shared/types/view/product";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  "3fold": "3 Fold",
  sfolderato: "SFOLDERATO",
  knit: "KNITTED",
  bowtie: "BOW TIE",
};

const COLOR_LABELS: Record<ProductColor, string> = {
  black: "블랙",
  navy: "네이비",
  gray: "그레이",
  wine: "와인",
  blue: "블루",
  brown: "브라운",
  beige: "베이지",
  silver: "실버",
};

const PATTERN_LABELS: Record<ProductPattern, string> = {
  solid: "무지",
  stripe: "스트라이프",
  dot: "도트",
  check: "체크",
  paisley: "페이즐리",
};

const MATERIAL_LABELS: Record<ProductMaterial, string> = {
  silk: "실크",
  cotton: "면",
  polyester: "폴리에스터",
  wool: "울",
};

export const getCategoryLabel = (category: ProductCategory): string => {
  return CATEGORY_LABELS[category];
};

export const getColorLabel = (color: ProductColor): string => {
  return COLOR_LABELS[color];
};

export const getPatternLabel = (pattern: ProductPattern): string => {
  return PATTERN_LABELS[pattern];
};

export const getMaterialLabel = (material: ProductMaterial): string => {
  return MATERIAL_LABELS[material];
};
