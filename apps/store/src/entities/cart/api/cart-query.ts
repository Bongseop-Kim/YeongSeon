import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import {
  clearCartItems,
  getCartItems,
  setCartItems,
} from "@/entities/cart/api/cart-api";
import { cartKeys } from "@/entities/cart/api/cart-keys";
import { useAuthStore } from "@/shared/store/auth";

export const useCartItems = () => {
  const { user, initialized } = useAuthStore();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: cartKeys.items(userId),
    queryFn: () => getCartItems(userId),
    enabled: initialized && !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};

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
