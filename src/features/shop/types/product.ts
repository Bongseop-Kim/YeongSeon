export interface Product {
  id: number;
  code: string;
  name: string;
  price: number;
  image: string;
  category: ProductCategory;
  color: ProductColor;
  pattern: ProductPattern;
  material: ProductMaterial;
  likes: number;
}

export type ProductCategory = "formal" | "casual" | "wedding" | "business";
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
