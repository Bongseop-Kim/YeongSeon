import { supabase } from "@/lib/supabase";
import type { Product } from "@/features/shop/types/view/product";
import type { ProductDTO } from "@/features/shop/types/dto/product";
import { toProduct, toProducts } from "@/features/shop/api/products-mapper";

const PRODUCT_VIEW = "product_list_view";
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
  let query = supabase.from(PRODUCT_VIEW).select("*");

  if (filters?.categories?.length) {
    query = query.in("category", filters.categories);
  }
  if (filters?.colors?.length) {
    query = query.in("color", filters.colors);
  }
  if (filters?.patterns?.length) {
    query = query.in("pattern", filters.patterns);
  }
  if (filters?.materials?.length) {
    query = query.in("material", filters.materials);
  }
  if (typeof filters?.priceMin === "number") {
    query = query.gte("price", filters.priceMin);
  }
  if (typeof filters?.priceMax === "number") {
    query = query.lte("price", filters.priceMax);
  }

  const sortOption = filters?.sortOption ?? "latest";
  if (sortOption === "price-low") {
    query = query.order("price", { ascending: true }).order("id", {
      ascending: false,
    });
  } else if (sortOption === "price-high") {
    query = query.order("price", { ascending: false }).order("id", {
      ascending: false,
    });
  } else if (sortOption === "popular") {
    query = query.order("likes", { ascending: false }).order("id", {
      ascending: false,
    });
  } else {
    query = query.order("id", { ascending: false });
  }

  const { data, error } = await query;

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
  const { data, error } = await supabase
    .from(PRODUCT_VIEW)
    .select("*")
    .eq("id", id)
    .maybeSingle();

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

  const { data, error } = await supabase
    .from(PRODUCT_VIEW)
    .select("*")
    .in("id", productIds)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`상품 정보를 불러올 수 없습니다: ${error.message}`);
  }

  const records = (data as ProductDTO[] | null) ?? [];
  const productsById = new Map<number, Product>(
    records.map((record) => [record.id, toProduct(record)])
  );

  return productsById;
};
