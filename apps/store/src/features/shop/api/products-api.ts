import { supabase } from "@/lib/supabase";
import type {
  Product,
  ProductCategory,
  ProductColor,
  ProductPattern,
  ProductMaterial,
  SortOption,
} from "@yeongseon/shared/types/view/product";
import type { ProductDTO } from "@yeongseon/shared/types/dto/product";
import { toProduct, toProducts } from "@/features/shop/api/products-mapper";

const PRODUCT_VIEW = "product_list_view";

export type ProductFilters = {
  categories?: ProductCategory[];
  colors?: ProductColor[];
  patterns?: ProductPattern[];
  materials?: ProductMaterial[];
  priceMin?: number | null;
  priceMax?: number | null;
  sortOption?: SortOption;
  limit?: number;
};

/**
 * 모든 제품 조회
 */
export const getProducts = async (
  filters?: ProductFilters,
): Promise<Product[]> => {
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

  if (
    typeof filters?.limit === "number" &&
    Number.isInteger(filters.limit) &&
    filters.limit > 0
  ) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`제품 조회 실패: ${error.message}`);
  }

  const records: ProductDTO[] = data ?? [];
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

  const record: ProductDTO | null = data ?? null;
  return record ? toProduct(record) : null;
};
