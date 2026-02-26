export interface ProductOption {
  id: string;
  name: string;
  additionalPrice: number;
  stock?: number | null;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  price: number;
  image: string;
  deleted?: boolean;
  detailImages?: string[];
  category: ProductCategory;
  color: ProductColor;
  pattern: ProductPattern;
  material: ProductMaterial;
  likes: number;
  isLiked?: boolean;
  info: string;
  stock?: number | null;
  options?: ProductOption[];
}

export type ProductCategory = "3fold" | "sfolderato" | "knit" | "bowtie";
export type ProductColor =
  | "black"
  | "navy"
  | "gray"
  | "wine"
  | "blue"
  | "brown"
  | "beige"
  | "silver";
export type ProductPattern = "solid" | "stripe" | "dot" | "check" | "paisley";
export type ProductMaterial = "silk" | "cotton" | "polyester" | "wool";
export type SortOption = "latest" | "price-low" | "price-high" | "popular";
