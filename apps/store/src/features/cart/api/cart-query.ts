import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCartItems,
  setCartItems,
  clearCartItems,
} from "@/features/cart/api/cart-api";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import { useAuthStore } from "@/store/auth";
import { cartKeys } from "@/features/cart/api/cart-keys";

export { cartKeys };

/**
 * 서버 장바구니 조회 쿼리
 * 인증 초기화 전이거나 비로그인 상태면 비활성화
 */
export const useCartItems = () => {
  const { user, initialized } = useAuthStore();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: cartKeys.items(userId),
    queryFn: () => getCartItems(userId),
    enabled: initialized && !!user?.id,
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

/**
 * 장바구니 저장 뮤테이션
 * CartSyncProvider에서 인증 초기화 전에도 훅으로 호출되므로,
 * userId는 mutationFn 실행 시점에 스토어에서 직접 읽는다.
 */
export const useSetCartItems = () => {
  const queryClient = useQueryClient();
  const getAuthState = useAuthStore.getState;

  return useMutation({
    mutationFn: (items: CartItem[]) => {
      const { user } = getAuthState();
      if (!user?.id) throw new Error("로그인이 필요합니다.");
      return setCartItems(user.id, items);
    },
    onMutate: async (items: CartItem[]) => {
      const { user } = getAuthState();
      if (!user?.id) return;
      await queryClient.cancelQueries({ queryKey: cartKeys.items(user.id) });
      const previous = queryClient.getQueryData<CartItem[]>(
        cartKeys.items(user.id),
      );
      queryClient.setQueryData(cartKeys.items(user.id), items);
      return { previous, userId: user.id };
    },
    onError: (_error, _items, context) => {
      if (context?.previous !== undefined && context.userId) {
        queryClient.setQueryData(
          cartKeys.items(context.userId),
          context.previous,
        );
      }
    },
    onSettled: (_data, _error, _items, context) => {
      if (context?.userId) {
        queryClient.invalidateQueries({
          queryKey: cartKeys.items(context.userId),
        });
      }
    },
  });
};

/**
 * 장바구니 초기화 뮤테이션
 */
export const useClearCartItems = () => {
  const queryClient = useQueryClient();
  const getAuthState = useAuthStore.getState;

  return useMutation({
    mutationFn: () => {
      const { user } = getAuthState();
      if (!user?.id) throw new Error("로그인이 필요합니다.");
      return clearCartItems(user.id);
    },
    onMutate: async () => {
      const { user } = getAuthState();
      if (!user?.id) return;
      await queryClient.cancelQueries({ queryKey: cartKeys.items(user.id) });
      const previous = queryClient.getQueryData<CartItem[]>(
        cartKeys.items(user.id),
      );
      queryClient.setQueryData(cartKeys.items(user.id), []);
      return { previous, userId: user.id };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous !== undefined && context.userId) {
        queryClient.setQueryData(
          cartKeys.items(context.userId),
          context.previous,
        );
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context?.userId) {
        queryClient.invalidateQueries({
          queryKey: cartKeys.items(context.userId),
        });
      }
    },
  });
};
