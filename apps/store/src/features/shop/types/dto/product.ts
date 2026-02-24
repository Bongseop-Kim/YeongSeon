export interface ProductOptionDTO {
  id: string;
  name: string;
  additionalPrice: number;
}

export type ProductCategoryDTO = "3fold" | "sfolderato" | "knit" | "bowtie";
export type ProductColorDTO =
  | "black"
  | "navy"
  | "gray"
  | "wine"
  | "blue"
  | "brown"
  | "beige"
  | "silver";
export type ProductPatternDTO = "solid" | "stripe" | "dot" | "check" | "paisley";
export type ProductMaterialDTO = "silk" | "cotton" | "polyester" | "wool";

export interface ProductDTO {
  id: number;
  code: string;
  name: string;
  price: number;
  image: string;
  deleted?: boolean;
  detailImages?: string[];
  category: ProductCategoryDTO;
  color: ProductColorDTO;
  pattern: ProductPatternDTO;
  material: ProductMaterialDTO;
  likes: number;
  isLiked?: boolean;
  info: string;
  options?: ProductOptionDTO[];
}
