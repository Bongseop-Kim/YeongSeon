import { supabase } from "@/lib/supabase";
import type { Product } from "@/features/shop/types/view/product";
import type { ProductDTO } from "@/features/shop/types/dto/product";
import { toProduct, toProducts } from "@/features/shop/api/products-mapper";
/**
 * 모든 제품 조회
 */
export const getProducts = async (filters?: {
  categories?: string[];
  colors?: string[];
  patterns?: string[];
  materials?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  sortOption?: string;
}): Promise<Product[]> => {
  const { data, error } = await supabase.rpc("get_products", {
    p_categories: filters?.categories?.length ? filters.categories : null,
    p_colors: filters?.colors?.length ? filters.colors : null,
    p_patterns: filters?.patterns?.length ? filters.patterns : null,
    p_materials: filters?.materials?.length ? filters.materials : null,
    p_price_min:
      typeof filters?.priceMin === "number" ? filters.priceMin : null,
    p_price_max:
      typeof filters?.priceMax === "number" ? filters.priceMax : null,
    p_sort_option: filters?.sortOption ?? "latest",
  });

  if (error) {
    throw new Error(`제품 조회 실패: ${error.message}`);
  }

  const records = (data as ProductDTO[]) ?? [];
  if (records.length === 0) {
    return [];
  }

  return toProducts(records);
};

/**
 * ID로 제품 조회
 */
export const getProductById = async (id: number): Promise<Product | null> => {
  const { data, error } = await supabase.rpc("get_product_by_id", {
    p_id: id,
  });

  if (error) {
    throw new Error(`제품 조회 실패: ${error.message}`);
  }

  const record = (data as ProductDTO | null) ?? null;
  return record ? toProduct(record) : null;
};

/**
 * IDs로 제품 조회
 */
export const getProductsByIds = async (
  productIds: number[]
): Promise<Map<number, Product>> => {
  if (productIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.rpc("get_products_by_ids", {
    p_ids: productIds,
  });

  if (error) {
    throw new Error(`상품 정보를 불러올 수 없습니다: ${error.message}`);
  }

  const records = (data as ProductDTO[] | null) ?? [];
  const productsById = new Map<number, Product>(
    records.map((record) => [record.id, toProduct(record)])
  );

  return productsById;
};
