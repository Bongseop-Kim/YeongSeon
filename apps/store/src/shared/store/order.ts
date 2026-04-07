import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";

interface TrackingInfo {
  courierCompany: string;
  trackingNumber: string;
}

interface OrderState {
  items: CartItem[];
  repairTracking: TrackingInfo | undefined;
  setOrderItems: (items: CartItem[]) => void;
  updateOrderItemCoupon: (
    itemId: string,
    coupon: AppliedCoupon | undefined,
  ) => void;
  setRepairTracking: (trackingInfo: TrackingInfo | undefined) => void;
  clearOrderItems: () => void;
  hasOrderItems: () => boolean;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      items: [],
      repairTracking: undefined,

      setOrderItems: (items) => {
        set({ items });
      },

      updateOrderItemCoupon: (itemId, coupon) => {
        set({
          items: get().items.map((item) =>
            item.id === itemId ? { ...item, appliedCoupon: coupon } : item,
          ),
        });
      },

      setRepairTracking: (trackingInfo) => {
        set({ repairTracking: trackingInfo });
      },

      clearOrderItems: () => {
        set({ items: [], repairTracking: undefined });
      },

      hasOrderItems: () => {
        return get().items.length > 0;
      },
    }),
    {
      name: "order-storage", // localStorage 키 이름
    },
  ),
);
