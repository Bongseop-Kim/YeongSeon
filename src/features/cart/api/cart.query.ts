import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCartItems, setCartItems, clearCartItems } from "./cart.api";
import type { CartItem } from "@/types/cart";
import { useAuthStore } from "@/store/auth";

/**
 * 장바구니 쿼리 키
 */
export const cartKeys = {
  all: ["cart"] as const,
  items: (userId?: string) => [...cartKeys.all, "items", userId] as const,
};

/**
 * 서버 장바구니 조회 쿼리
 * 로그인 상태에서만 사용
 */
export const useCartItems = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: cartKeys.items(user?.id),
    queryFn: () => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return getCartItems(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

/**
 * 장바구니 저장 뮤테이션
 */
export const useSetCartItems = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (items: CartItem[]) => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return setCartItems(user.id, items);
    },
    onSuccess: (_, items) => {
      // 쿼리 캐시 업데이트
      if (user?.id) {
        queryClient.setQueryData(cartKeys.items(user.id), items);
      }
    },
    onError: (error) => {
      console.error("장바구니 저장 실패:", error);
    },
  });
};

/**
 * 장바구니 초기화 뮤테이션
 */
export const useClearCartItems = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: () => {
      if (!user?.id) {
        throw new Error("로그인이 필요합니다.");
      }
      return clearCartItems(user.id);
    },
    onSuccess: () => {
      // 쿼리 캐시 초기화
      if (user?.id) {
        queryClient.setQueryData(cartKeys.items(user.id), []);
        queryClient.invalidateQueries({ queryKey: cartKeys.items(user.id) });
      }
    },
    onError: (error) => {
      console.error("장바구니 초기화 실패:", error);
    },
  });
};
