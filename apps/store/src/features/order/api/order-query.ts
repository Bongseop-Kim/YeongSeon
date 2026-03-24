import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOrders,
  getOrder,
  confirmPurchase,
} from "@/features/order/api/order-api";
import type { ListFilters } from "@/features/order/utils/list-filters";
import { useRequiredUser } from "@/hooks/use-required-user";

/**
 * 주문 쿼리 키
 */
export const orderKeys = {
  all: ["orders"] as const,
  list: (userId?: string, filters?: ListFilters) =>
    [
      ...orderKeys.all,
      "list",
      userId,
      filters?.keyword ?? "",
      filters?.dateFrom ?? "",
      filters?.dateTo ?? "",
    ] as const,
  detail: (orderId: string) => [...orderKeys.all, "detail", orderId] as const,
};

/**
 * 주문 목록 조회 쿼리
 */
export const useOrders = (filters?: ListFilters) => {
  const userId = useRequiredUser();

  return useQuery({
    queryKey: orderKeys.list(userId, filters),
    queryFn: () => getOrders(filters),
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

/**
 * 주문 상세 조회 쿼리
 */
const useOrder = (orderId: string) => {
  useRequiredUser();

  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => getOrder(orderId),
    enabled: !!orderId,
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

/**
 * 주문 상세 페이지 상태 조회 훅
 */
export const useOrderDetail = (orderId?: string) => {
  const query = useOrder(orderId ?? "");

  return {
    ...query,
    order: query.data ?? null,
    isNotFound:
      !!orderId && !query.isLoading && !query.isError && query.data === null,
  };
};

/**
 * 구매확정 뮤테이션
 */
export const useConfirmPurchase = (orderId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => confirmPurchase(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
    onError: (error) => {
      console.error("구매확정 실패:", error);
    },
  });
};
