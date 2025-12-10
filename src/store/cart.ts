import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, ReformCartItem } from "@/types/cart";
import type { Product, ProductOption } from "@/features/shop/types/product";
import type { Coupon } from "@/types/coupon";
import type { TieItem } from "@/features/reform/types/reform";
import { calculateDiscount } from "@/types/coupon";
import { useModalStore } from "./modal";
import { generateItemId } from "@/lib/utils";

interface CartState {
  items: CartItem[];
  addToCart: (
    product: Product,
    options?: { option?: ProductOption; quantity?: number; showModal?: boolean }
  ) => void;
  addReformToCart: (reformData: { tie: TieItem; cost: number }) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateReformOption: (itemId: string, tie: TieItem) => void;
  applyCoupon: (itemId: string, coupon: Coupon | undefined) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addToCart: (product, options = {}) => {
        const { option, quantity = 1, showModal = true } = options;
        const items = get().items;

        // 같은 상품 + 같은 옵션이 이미 장바구니에 있는지 확인
        const existingItemIndex = items.findIndex(
          (item) =>
            item.type === "product" &&
            item.product.id === product.id &&
            item.selectedOption?.id === option?.id
        );

        if (existingItemIndex !== -1) {
          // 이미 있으면 수량만 증가
          const updatedItems = [...items];
          updatedItems[existingItemIndex].quantity += quantity;
          set({ items: updatedItems });

          if (showModal) {
            useModalStore.getState().openModal({
              title: "장바구니",
              description:
                "이미 장바구니에 있는 상품입니다. 수량을 추가했습니다.",
              confirmText: "장바구니 보기",
              cancelText: "닫기",
              onConfirm: () => {
                window.location.href = "/cart";
              },
            });
          }
        } else {
          // 새로운 아이템 추가
          const newItem: CartItem = {
            id: generateItemId(product.id, option?.id || "base"),
            type: "product",
            product,
            selectedOption: option,
            quantity,
          };

          set({ items: [...items, newItem] });
          if (showModal) {
            useModalStore.getState().openModal({
              title: "장바구니",
              description: "장바구니에 추가되었습니다.",
              confirmText: "장바구니 보기",
              cancelText: "닫기",
              onConfirm: () => {
                window.location.href = "/cart";
              },
            });
          }
        }
      },

      addReformToCart: (reformData) => {
        const items = get().items;

        // 새로운 수선 아이템 추가
        const newItem: ReformCartItem = {
          id: generateItemId("reform"),
          type: "reform",
          quantity: 1,
          reformData,
        };

        set({ items: [...items, newItem] });

        useModalStore.getState().openModal({
          title: "장바구니",
          description: "수선 요청이 장바구니에 추가되었습니다.",
          confirmText: "장바구니 보기",
          cancelText: "닫기",
          onConfirm: () => {
            window.location.href = "/cart";
          },
        });
      },

      removeFromCart: (itemId) => {
        set({ items: get().items.filter((item) => item.id !== itemId) });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity < 1) return;

        set({
          items: get().items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        });
      },

      updateReformOption: (itemId, tie) => {
        set({
          items: get().items.map((item) =>
            item.id === itemId && item.type === "reform"
              ? { ...item, reformData: { ...item.reformData, tie } }
              : item
          ),
        });
      },

      applyCoupon: (itemId, coupon) => {
        set({
          items: get().items.map((item) =>
            item.id === itemId ? { ...item, appliedCoupon: coupon } : item
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          if (item.type === "product") {
            const basePrice = item.product.price;
            const optionPrice = item.selectedOption?.additionalPrice || 0;
            const itemPrice = basePrice + optionPrice;
            const discount = calculateDiscount(itemPrice, item.appliedCoupon);
            const finalPrice = (itemPrice - discount) * item.quantity;
            return total + finalPrice;
          } else {
            // reform 아이템
            const itemPrice = item.reformData.cost;
            const discount = calculateDiscount(itemPrice, item.appliedCoupon);
            const finalPrice = (itemPrice - discount) * item.quantity;
            return total + finalPrice;
          }
        }, 0);
      },
    }),
    {
      name: "cart-storage", // localStorage 키 이름
    }
  )
);
