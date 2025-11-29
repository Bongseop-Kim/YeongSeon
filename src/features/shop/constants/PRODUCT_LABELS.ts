import type {
  ProductCategory,
  ProductColor,
  ProductPattern,
  ProductMaterial,
} from "../types/product";

/**
 * 카테고리 키-값 매핑
 */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  "3fold": "3FOLD",
  sfolderato: "SFOLDERATO",
  knit: "KNITTED",
  bowtie: "BOW TIE",
} as const;

/**
 * 색상 키-값 매핑
 */
export const COLOR_LABELS: Record<ProductColor, string> = {
  black: "블랙",
  navy: "네이비",
  gray: "그레이",
  wine: "와인",
  blue: "블루",
  brown: "브라운",
  beige: "베이지",
  silver: "실버",
} as const;

/**
 * 패턴 키-값 매핑
 */
export const PATTERN_LABELS: Record<ProductPattern, string> = {
  solid: "무지",
  stripe: "스트라이프",
  dot: "도트",
  check: "체크",
  paisley: "페이즐리",
} as const;

/**
 * 소재 키-값 매핑
 */
export const MATERIAL_LABELS: Record<ProductMaterial, string> = {
  silk: "실크",
  cotton: "면",
  polyester: "폴리에스터",
  wool: "울",
} as const;

/**
 * 카테고리 라벨 조회 헬퍼 함수
 */
export const getCategoryLabel = (category: ProductCategory): string => {
  return CATEGORY_LABELS[category];
};

/**
 * 색상 라벨 조회 헬퍼 함수
 */
export const getColorLabel = (color: ProductColor): string => {
  return COLOR_LABELS[color];
};

/**
 * 패턴 라벨 조회 헬퍼 함수
 */
export const getPatternLabel = (pattern: ProductPattern): string => {
  return PATTERN_LABELS[pattern];
};

/**
 * 소재 라벨 조회 헬퍼 함수
 */
export const getMaterialLabel = (material: ProductMaterial): string => {
  return MATERIAL_LABELS[material];
};
