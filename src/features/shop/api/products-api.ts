import { supabase } from "@/lib/supabase";
import type { Product } from "../types/product";
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

  const records = (data as Product[]) ?? [];
  if (records.length === 0) {
    return [];
  }

  return records;
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

  return (data as Product | null) ?? null;
};
