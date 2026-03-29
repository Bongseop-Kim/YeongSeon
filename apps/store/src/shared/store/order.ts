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
  trackingInfoMap: Record<string, TrackingInfo>;
  setOrderItems: (items: CartItem[]) => void;
  updateOrderItemCoupon: (
    itemId: string,
    coupon: AppliedCoupon | undefined,
  ) => void;
  updateOrderItemTracking: (
    itemId: string,
    trackingInfo: TrackingInfo | undefined,
  ) => void;
  getTrackingInfo: (itemId: string) => TrackingInfo | undefined;
  clearOrderItems: () => void;
  hasOrderItems: () => boolean;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      items: [],
      trackingInfoMap: {},

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

      updateOrderItemTracking: (itemId, trackingInfo) => {
        set((state) => {
          const next = { ...state.trackingInfoMap };
          if (trackingInfo) {
            next[itemId] = trackingInfo;
          } else {
            delete next[itemId];
          }
          return { trackingInfoMap: next };
        });
      },

      getTrackingInfo: (itemId) => {
        return get().trackingInfoMap[itemId];
      },

      clearOrderItems: () => {
        set({ items: [], trackingInfoMap: {} });
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
