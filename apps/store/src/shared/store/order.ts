import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";
import type { RepairNoTrackingReason } from "@yeongseon/shared/constants/repair-shipping";

/** ImageKit에 업로드 완료된 발송 사진 */
export interface RepairShippingPhoto {
  url: string;
  fileId: string;
}

/**
 * 주문서에서 입력한 수선품 발송 정보.
 * 결제 리다이렉트 후 success 페이지에서 발송 등록에 사용하므로
 * 직렬화 가능한 값만 담는다 (File 금지 — 사진은 결제 직전 업로드).
 */
export interface RepairShippingDraft {
  method: "direct" | "pickup";
  tracking?: {
    courierCompany: string;
    trackingNumber: string;
    photos: RepairShippingPhoto[];
  };
  noTracking?: {
    reason: RepairNoTrackingReason;
    memo: string;
    photos: RepairShippingPhoto[];
  };
}

interface OrderState {
  items: CartItem[];
  repairShipping: RepairShippingDraft | undefined;
  setOrderItems: (items: CartItem[]) => void;
  updateOrderItemCoupon: (
    itemId: string,
    coupon: AppliedCoupon | undefined,
  ) => void;
  setRepairShipping: (draft: RepairShippingDraft | undefined) => void;
  clearOrderItems: () => void;
  hasOrderItems: () => boolean;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      items: [],
      repairShipping: undefined,

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

      setRepairShipping: (draft) => {
        set({ repairShipping: draft });
      },

      clearOrderItems: () => {
        set({ items: [], repairShipping: undefined });
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
