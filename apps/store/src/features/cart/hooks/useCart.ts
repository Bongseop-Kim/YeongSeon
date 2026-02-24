import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { Product, ProductOption } from "@yeongseon/shared/types/view/product";
import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";
import type { TieItem } from "@yeongseon/shared/types/view/reform";
import { calculateOrderSummary } from "@/features/order/utils/calculated-order-totals";
import { useModalStore } from "@/store/modal";
import { generateItemId } from "@/lib/utils";
import { ROUTES } from "@/constants/ROUTES";
import {
  clearGuest,
  getGuestItems,
  setGuestItems,
} from "@/features/cart/utils/cart-local-storage";
import { useAuthStore } from "@/store/auth";
import { toast } from "@/lib/toast";
import {
  cartKeys,
  useCartItems,
  useClearCartItems,
  useSetCartItems,
} from "@/features/cart/api/cart-query";
import {
  addProductToCart,
  addReformToCart as addReformItemToCart,
  applyCartItemCoupon,
  removeCartItem,
  updateCartItemQuantity,
  updateProductCartItemOption,
  updateReformCartItemOption,
} from "@/features/cart/hooks/cart-item-operations";
import {
  clearCartItemsWithRollback,
  syncCartItemsWithRollback,
} from "@/features/cart/hooks/cart-sync";

type AddToCartOptions = {
  option?: ProductOption;
  quantity?: number;
  showModal?: boolean;
};

/**
 * React Query + localStorage 기반 장바구니 hook
 * - 로그인: 서버 장바구니 쿼리 + mutation 사용
 * - 비로그인: localStorage를 쿼리로 관리
 */
export function useCart() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const isLoggedIn = !!userId;
  const queryClient = useQueryClient();

  const { openModal } = useModalStore();

  const guestCartQuery = useQuery({
    queryKey: cartKeys.guest(),
    queryFn: () => getGuestItems(),
    enabled: !isLoggedIn,
    staleTime: Infinity,
  });

  const serverCartQuery = useCartItems();
  const setCartItemsMutation = useSetCartItems();
  const clearCartItemsMutation = useClearCartItems();

  const items = useMemo<CartItem[]>(() => {
    if (isLoggedIn) {
      return serverCartQuery.data ?? [];
    }
    return guestCartQuery.data ?? [];
  }, [guestCartQuery.data, isLoggedIn, serverCartQuery.data]);

  const syncItems = useCallback(
    async (nextItems: CartItem[], previousItems: CartItem[]) => {
      await syncCartItemsWithRollback({
        isLoggedIn,
        userId,
        queryClient,
        nextItems,
        previousItems,
        setGuestItems,
        setCartItems: setCartItemsMutation.mutateAsync,
        onError: toast.error,
        errorMessage: "장바구니 업데이트에 실패했습니다. 다시 시도해주세요.",
      });
    },
    [isLoggedIn, queryClient, setCartItemsMutation, userId]
  );

  const addToCart = useCallback(
    async (product: Product, options: AddToCartOptions = {}) => {
      const { option, quantity = 1, showModal = true } = options;
      const result = addProductToCart(items, product, option, quantity, generateItemId);
      await syncItems(result.nextItems, items);

      if (showModal) {
        openModal({
          title: "장바구니",
          description: result.wasExistingItem
            ? "이미 장바구니에 있는 상품입니다. 수량을 추가했습니다."
            : "장바구니에 추가되었습니다.",
          confirmText: "장바구니 보기",
          cancelText: "닫기",
          onConfirm: () => {
            window.location.href = ROUTES.CART;
          },
        });
      }
    },
    [items, openModal, syncItems]
  );

  const addReformToCart = useCallback(
    async (reformData: { tie: TieItem; cost: number }) => {
      const nextItems = addReformItemToCart(items, reformData, generateItemId);
      await syncItems(nextItems, items);

      openModal({
        title: "장바구니",
        description: "수선 요청이 장바구니에 추가되었습니다.",
        confirmText: "장바구니 보기",
        cancelText: "닫기",
        onConfirm: () => {
          window.location.href = ROUTES.CART;
        },
      });
    },
    [items, openModal, syncItems]
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      const nextItems = removeCartItem(items, itemId);
      await syncItems(nextItems, items);
    },
    [items, syncItems]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const nextItems = updateCartItemQuantity(items, itemId, quantity);
      if (nextItems === items) return;
      await syncItems(nextItems, items);
    },
    [items, syncItems]
  );

  const updateReformOption = useCallback(
    async (itemId: string, tie: TieItem) => {
      const nextItems = updateReformCartItemOption(items, itemId, tie);
      await syncItems(nextItems, items);
    },
    [items, syncItems]
  );

  const applyCoupon = useCallback(
    async (itemId: string, coupon: AppliedCoupon | undefined) => {
      const nextItems = applyCartItemCoupon(items, itemId, coupon);
      await syncItems(nextItems, items);
    },
    [items, syncItems]
  );

  const updateProductOption = useCallback(
    async (
      itemId: string,
      newOption: ProductOption | undefined,
      newQuantity: number
    ) => {
      const nextItems = updateProductCartItemOption(
        items,
        itemId,
        newOption,
        newQuantity,
        generateItemId
      );
      await syncItems(nextItems, items);
    },
    [items, syncItems]
  );

  const clearCart = useCallback(async () => {
    await clearCartItemsWithRollback({
      isLoggedIn,
      userId,
      queryClient,
      previousItems: items,
      clearGuest,
      clearServerCart: clearCartItemsMutation.mutateAsync,
      setGuestItems,
      onError: toast.error,
      errorMessage: "장바구니를 비우지 못했어요. 다시 시도해주세요.",
    });
  }, [clearCartItemsMutation, isLoggedIn, items, queryClient, userId]);

  const summary = useMemo(() => calculateOrderSummary(items), [items]);
  const totalItems = summary.totalQuantity;
  const totalPrice = summary.totalPrice;

  const initialized = isLoggedIn
    ? serverCartQuery.isFetched || serverCartQuery.isError
    : guestCartQuery.isFetched || guestCartQuery.isError;

  const isLoading = isLoggedIn
    ? serverCartQuery.isLoading || serverCartQuery.isFetching
    : guestCartQuery.isLoading || guestCartQuery.isFetching;

  return {
    items,
    initialized,
    isLoading,
    addToCart,
    addReformToCart,
    removeFromCart,
    updateQuantity,
    updateProductOption,
    updateReformOption,
    applyCoupon,
    clearCart,
    totalItems,
    totalPrice,
  };
}
