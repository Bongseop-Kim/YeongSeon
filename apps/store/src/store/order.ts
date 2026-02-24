import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";

interface OrderState {
  items: CartItem[];
  setOrderItems: (items: CartItem[]) => void;
  updateOrderItemCoupon: (
    itemId: string,
    coupon: AppliedCoupon | undefined
  ) => void;
  clearOrderItems: () => void;
  hasOrderItems: () => boolean;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      items: [],

      setOrderItems: (items) => {
        set({ items });
      },

      updateOrderItemCoupon: (itemId, coupon) => {
        set({
          items: get().items.map((item) =>
            item.id === itemId ? { ...item, appliedCoupon: coupon } : item
          ),
        });
      },

      clearOrderItems: () => {
        set({ items: [] });
      },

      hasOrderItems: () => {
        return get().items.length > 0;
      },
    }),
    {
      name: "order-storage", // localStorage 키 이름
    }
  )
);
