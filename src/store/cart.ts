import { create } from "zustand";
import type { CartItem, ReformCartItem } from "@/features/cart/types/cart";
import type { Product, ProductOption } from "@/features/shop/types/product";
import type { AppliedCoupon } from "@/features/order/types/coupon";
import type { TieItem } from "@/features/reform/types/reform";
import { calculateDiscount } from "@/features/order/utils/calculate-discount";
import { useModalStore } from "./modal";
import { generateItemId } from "@/lib/utils";
import { ROUTES } from "@/constants/ROUTES";
import { cartLocalService } from "@/features/cart/model/cart-local.service";
import { CartSyncManager } from "@/features/cart/model/cart-sync-manager";
import { useAuthStore } from "./auth";

interface CartState {
  items: CartItem[];
  initialized: boolean;
  initialize: () => Promise<void>;
  addToCart: (
    product: Product,
    options?: { option?: ProductOption; quantity?: number; showModal?: boolean }
  ) => Promise<void>;
  addReformToCart: (reformData: {
    tie: TieItem;
    cost: number;
  }) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  updateReformOption: (itemId: string, tie: TieItem) => Promise<void>;
  applyCoupon: (
    itemId: string,
    coupon: AppliedCoupon | undefined
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  syncItems: (items: CartItem[]) => Promise<void>;
}

/**
 * 초기화 중인 Promise를 저장하는 락 메커니즘
 * 동시에 여러 번 initialize가 호출되어도 한 번만 실행되도록 보장
 */
let initializationPromise: Promise<void> | null = null;

/**
 * 장바구니 아이템을 업데이트하고 동기화하는 헬퍼 함수
 */
async function updateItemsAndSync(
  set: (state: Partial<CartState>) => void,
  get: () => CartState,
  updater: (items: CartItem[]) => CartItem[]
): Promise<void> {
  const currentItems = get().items;
  const updatedItems = updater(currentItems);
  const { user } = useAuthStore.getState();

  // 로컬 상태 즉시 업데이트
  set({ items: updatedItems });

  // CartSyncManager를 통해 저장 (로컬 + 서버 즉시 동기화)
  await CartSyncManager.updateItemsImmediate(updatedItems, user?.id);
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  initialized: false,

  initialize: async () => {
    // 이미 초기화 완료되었으면 즉시 반환
    if (get().initialized) return;

    // 이미 초기화 중이면 기존 Promise 반환 (락 메커니즘)
    if (initializationPromise) {
      return initializationPromise;
    }

    // 새로운 초기화 Promise 생성
    initializationPromise = (async () => {
      try {
        const { user } = useAuthStore.getState();

        if (user?.id) {
          // 로그인 상태: 유저 캐시 또는 빈 배열 로드
          const cacheItems = await cartLocalService.getUserCacheItems(user.id);
          set({ items: cacheItems, initialized: true });
        } else {
          // 비로그인 상태: 게스트 카트만 로드
          const guestItems = await cartLocalService.getGuestItems();
          set({ items: guestItems, initialized: true });
        }
      } catch (error) {
        console.error("Failed to initialize cart:", error);
        set({ items: [], initialized: true });
      } finally {
        // 초기화 완료 후 Promise 정리
        initializationPromise = null;
      }
    })();

    return initializationPromise;
  },

  addToCart: async (product, options = {}) => {
    const { option, quantity = 1, showModal = true } = options;
    const newItem: CartItem = {
      id: generateItemId(product.id, option?.id || "base"),
      type: "product",
      product,
      selectedOption: option,
      quantity,
    };

    // updater 내부에서 기존 아이템 존재 여부 추적
    let wasExistingItem = false;

    // updater 내부에서 인덱스를 계산하고 업데이트 수행
    await updateItemsAndSync(set, get, (currentItems) => {
      // updater 내부에서 현재 상태를 기반으로 인덱스 계산
      const existingItemIndex = currentItems.findIndex(
        (item) =>
          item.type === "product" &&
          item.product.id === product.id &&
          item.selectedOption?.id === option?.id
      );

      if (existingItemIndex !== -1) {
        // 기존 아이템이 있으면 새 객체로 교체 (spread 사용, 직접 mutation 방지)
        wasExistingItem = true;
        const existingItem = currentItems[existingItemIndex];
        return currentItems.map((item, index) =>
          index === existingItemIndex
            ? { ...existingItem, quantity: existingItem.quantity + quantity }
            : item
        );
      } else {
        // 기존 아이템이 없으면 새 아이템 추가
        wasExistingItem = false;
        return [...currentItems, newItem];
      }
    });

    // updater 완료 후 모달 표시 (updater 결과 기반)
    if (showModal) {
      useModalStore.getState().openModal({
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

  addReformToCart: async (reformData) => {
    const newItem: ReformCartItem = {
      id: generateItemId("reform"),
      type: "reform",
      quantity: 1,
      reformData,
    };

    await updateItemsAndSync(set, get, (currentItems) => [
      ...currentItems,
      newItem,
    ]);

    useModalStore.getState().openModal({
      title: "장바구니",
      description: "수선 요청이 장바구니에 추가되었습니다.",
      confirmText: "장바구니 보기",
      cancelText: "닫기",
      onConfirm: () => {
        window.location.href = ROUTES.CART;
      },
    });
  },

  removeFromCart: async (itemId) => {
    await updateItemsAndSync(set, get, (currentItems) =>
      currentItems.filter((item) => item.id !== itemId)
    );
  },

  updateQuantity: async (itemId, quantity) => {
    if (quantity < 1) return;

    await updateItemsAndSync(set, get, (currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  },

  updateReformOption: async (itemId, tie) => {
    await updateItemsAndSync(set, get, (currentItems) =>
      currentItems.map((item) =>
        item.id === itemId && item.type === "reform"
          ? { ...item, reformData: { ...item.reformData, tie } }
          : item
      )
    );
  },

  applyCoupon: async (itemId, coupon) => {
    await updateItemsAndSync(set, get, (currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, appliedCoupon: coupon } : item
      )
    );
  },

  clearCart: async () => {
    const { user } = useAuthStore.getState();
    set({ items: [] });
    await CartSyncManager.clear(user?.id);
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

  syncItems: async (items: CartItem[]) => {
    const { user } = useAuthStore.getState();
    set({ items, initialized: true });
    await CartSyncManager.forceSync(items, user?.id);
  },
}));
