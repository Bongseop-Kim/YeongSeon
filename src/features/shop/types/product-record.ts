import type { Product } from "./product";

/**
 * Supabase에서 가져온 제품 옵션 레코드 타입
 */
export interface ProductOptionRecord {
  id: string;
  product_id: number;
  option_id: string;
  name: string;
  additional_price: number;
}

/**
 * Supabase에서 가져온 제품 레코드 타입
 */
export interface ProductRecord {
  id: number;
  code: string;
  name: string;
  price: number;
  image: string;
  category: Product["category"];
  color: Product["color"];
  pattern: Product["pattern"];
  material: Product["material"];
  likes: number;
  info: string;
  created_at: string;
  updated_at: string;
}
