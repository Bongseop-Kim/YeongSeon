import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createOrder, getOrders, getOrder } from "./order-api";
import type { CreateOrderRequest } from "./order-mapper";
import { useAuthStore } from "@/store/auth";

/**
 * 주문 쿼리 키
 */
export const orderKeys = {
  all: ["orders"] as const,
  list: (userId?: string) => [...orderKeys.all, "list", userId] as const,
  detail: (orderId: string) => [...orderKeys.all, "detail", orderId] as const,
};

/**
 * 주문 목록 조회 쿼리
 */
export const useOrders = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: orderKeys.list(user?.id),
    queryFn: () => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return getOrders(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

/**
 * 주문 상세 조회 쿼리
 */
export const useOrder = (orderId: string) => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return getOrder(user.id, orderId);
    },
    enabled: !!user?.id && !!orderId,
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

/**
 * 주문 생성 뮤테이션
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (request: CreateOrderRequest) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return createOrder(request);
    },
    onSuccess: () => {
      // 주문 목록 쿼리 무효화
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: orderKeys.list(user.id) });
      }
      // 장바구니 쿼리 무효화 (주문 완료 후 장바구니 비우기)
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error) => {
      console.error("주문 생성 실패:", error);
    },
  });
};
