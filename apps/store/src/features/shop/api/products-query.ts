import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/features/shop/api/products-api";
import type { ProductFilters } from "@/features/shop/api/products-api";

/**
 * 제품 쿼리 키
 */
const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (filters?: ProductFilters) =>
    [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (id: number) => [...productKeys.details(), id] as const,
};

/**
 * 모든 제품 조회 쿼리
 */
export const useProducts = (
  filters?: ProductFilters,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => getProducts(filters),
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: options?.enabled !== false,
  });
};
