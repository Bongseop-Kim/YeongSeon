import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCartItems,
  setCartItems,
  clearCartItems,
} from "@/features/cart/api/cart-api";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import { useRequiredUser } from "@/hooks/use-required-user";
import { cartKeys } from "@/features/cart/api/cart-keys";

export { cartKeys };

/**
 * 서버 장바구니 조회 쿼리
 * 로그인 상태에서만 사용
 */
export const useCartItems = () => {
  const userId = useRequiredUser();

  return useQuery({
    queryKey: cartKeys.items(userId),
    queryFn: () => getCartItems(userId),
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
  const userId = useRequiredUser();

  return useMutation({
    mutationFn: (items: CartItem[]) => setCartItems(userId, items),
    onSuccess: (_, items) => {
      // 쿼리 캐시 업데이트
      queryClient.setQueryData(cartKeys.items(userId), items);
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
  const userId = useRequiredUser();

  return useMutation({
    mutationFn: () => clearCartItems(userId),
    onSuccess: () => {
      // 쿼리 캐시 초기화
      queryClient.setQueryData(cartKeys.items(userId), []);
    },
    onError: (error) => {
      console.error("장바구니 초기화 실패:", error);
    },
  });
};
