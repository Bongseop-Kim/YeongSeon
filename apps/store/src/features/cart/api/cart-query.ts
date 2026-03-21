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
    onMutate: async (items: CartItem[]) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.items(userId) });
      const previous = queryClient.getQueryData<CartItem[]>(
        cartKeys.items(userId),
      );
      queryClient.setQueryData(cartKeys.items(userId), items);
      return { previous };
    },
    onError: (_error, _items, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(cartKeys.items(userId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.items(userId) });
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cartKeys.items(userId) });
      const previous = queryClient.getQueryData<CartItem[]>(
        cartKeys.items(userId),
      );
      queryClient.setQueryData(cartKeys.items(userId), []);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(cartKeys.items(userId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.items(userId) });
    },
  });
};
