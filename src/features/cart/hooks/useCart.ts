import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartItem, ReformCartItem } from "@/features/cart/types/cart";
import type { Product, ProductOption } from "@/features/shop/types/product";
import type { AppliedCoupon } from "@/features/order/types/coupon";
import type { TieItem } from "@/features/reform/types/reform";
import { calculateDiscount } from "@/features/order/utils/calculate-discount";
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
      const applyOptimistic = async () => {
        if (isLoggedIn && userId) {
          queryClient.setQueryData(cartKeys.items(userId), nextItems);
          return;
        }
        queryClient.setQueryData(cartKeys.guest(), nextItems);
        await setGuestItems(nextItems);
      };

      const rollback = async () => {
        if (isLoggedIn && userId) {
          queryClient.setQueryData(cartKeys.items(userId), previousItems);
          return;
        }
        queryClient.setQueryData(cartKeys.guest(), previousItems);
        await setGuestItems(previousItems);
      };

      try {
        await applyOptimistic();

        if (isLoggedIn && userId) {
          await setCartItemsMutation.mutateAsync(nextItems);
        }
      } catch (error) {
        await rollback();
        toast.error("장바구니 업데이트에 실패했습니다. 다시 시도해주세요.");
        throw error;
      }
    },
    [isLoggedIn, queryClient, setCartItemsMutation, userId]
  );

  const updateItems = useCallback(
    async (updater: (items: CartItem[]) => CartItem[]) => {
      const previousItems = items;
      const updatedItems = updater(previousItems);
      await syncItems(updatedItems, previousItems);
    },
    [items, syncItems]
  );

  const addToCart = useCallback(
    async (product: Product, options: AddToCartOptions = {}) => {
      const { option, quantity = 1, showModal = true } = options;
      const newItem: CartItem = {
        id: generateItemId(product.id, option?.id || "base"),
        type: "product",
        product,
        selectedOption: option,
        quantity,
      };

      let wasExistingItem = false;

      await updateItems((currentItems) => {
        const existingItemIndex = currentItems.findIndex(
          (item) =>
            item.type === "product" &&
            item.product.id === product.id &&
            item.selectedOption?.id === option?.id
        );

        if (existingItemIndex !== -1) {
          wasExistingItem = true;
          const existingItem = currentItems[existingItemIndex];
          return currentItems.map((item, index) =>
            index === existingItemIndex
              ? { ...existingItem, quantity: existingItem.quantity + quantity }
              : item
          );
        }

        wasExistingItem = false;
        return [...currentItems, newItem];
      });

      if (showModal) {
        openModal({
          title: "장바구니",
          description: wasExistingItem
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
    [openModal, updateItems]
  );

  const addReformToCart = useCallback(
    async (reformData: { tie: TieItem; cost: number }) => {
      const newItem: ReformCartItem = {
        id: generateItemId("reform"),
        type: "reform",
        quantity: 1,
        reformData,
      };

      await updateItems((currentItems) => [...currentItems, newItem]);

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
    [openModal, updateItems]
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      await updateItems((currentItems) =>
        currentItems.filter((item) => item.id !== itemId)
      );
    },
    [updateItems]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity < 1) return;

      await updateItems((currentItems) =>
        currentItems.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    },
    [updateItems]
  );

  const updateReformOption = useCallback(
    async (itemId: string, tie: TieItem) => {
      await updateItems((currentItems) =>
        currentItems.map((item) =>
          item.id === itemId && item.type === "reform"
            ? { ...item, reformData: { ...item.reformData, tie } }
            : item
        )
      );
    },
    [updateItems]
  );

  const applyCoupon = useCallback(
    async (itemId: string, coupon: AppliedCoupon | undefined) => {
      await updateItems((currentItems) =>
        currentItems.map((item) =>
          item.id === itemId ? { ...item, appliedCoupon: coupon } : item
        )
      );
    },
    [updateItems]
  );

  const clearCart = useCallback(async () => {
    const previousItems = items;
    const rollback = async () => {
      if (isLoggedIn && userId) {
        queryClient.setQueryData(cartKeys.items(userId), previousItems);
        return;
      }
      queryClient.setQueryData(cartKeys.guest(), previousItems);
      await setGuestItems(previousItems);
    };

    if (isLoggedIn && userId) {
      try {
        queryClient.setQueryData(cartKeys.items(userId), []);
        await clearCartItemsMutation.mutateAsync();
      } catch (error) {
        await rollback();
        toast.error("장바구니를 비우지 못했어요. 다시 시도해주세요.");
        throw error;
      }
      return;
    }

    try {
      queryClient.setQueryData(cartKeys.guest(), []);
      await clearGuest();
    } catch (error) {
      await rollback();
      toast.error("장바구니를 비우지 못했어요. 다시 시도해주세요.");
      throw error;
    }
  }, [clearCartItemsMutation, isLoggedIn, items, queryClient, userId]);

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () =>
      items.reduce((total, item) => {
        if (item.type === "product") {
          const basePrice = item.product.price;
          const optionPrice = item.selectedOption?.additionalPrice || 0;
          const itemPrice = basePrice + optionPrice;
          const discount = calculateDiscount(itemPrice, item.appliedCoupon);
          const finalPrice = (itemPrice - discount) * item.quantity;
          return total + finalPrice;
        }

        const itemPrice = item.reformData.cost;
        const discount = calculateDiscount(itemPrice, item.appliedCoupon);
        const finalPrice = (itemPrice - discount) * item.quantity;
        return total + finalPrice;
      }, 0),
    [items]
  );

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
    updateReformOption,
    applyCoupon,
    clearCart,
    totalItems,
    totalPrice,
  };
}
