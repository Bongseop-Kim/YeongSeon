import { queryClient } from "@/lib/query-client";
import { cartSyncService } from "./cart-sync.service";
import {
  setCartItems as setCartItemsApi,
  clearCartItems as clearCartItemsApi,
} from "../api/cart.api";
import { cartKeys } from "../api/cart.query";
import type { CartItem } from "@/features/cart/types/cart";

/**
 * 장바구니 동기화 매니저
 * React Query 캐시와 Zustand store를 동기화하는 헬퍼 클래스
 * CartSyncService를 래핑하여 React Query 캐시 업데이트를 자동으로 처리합니다.
 */
export class CartSyncManager {
  /**
   * 서버 동기화 함수 생성 (React Query 캐시 자동 업데이트 포함)
   */
  private static createSyncToServer(userId: string) {
    return async (items: CartItem[]) => {
      try {
        await setCartItemsApi(userId, items);
        // React Query 캐시 업데이트
        queryClient.setQueryData(cartKeys.items(userId), items);
      } catch (error) {
        console.error("Failed to sync cart to server:", error);
        throw error;
      }
    };
  }

  /**
   * 서버 초기화 함수 생성 (React Query 캐시 자동 업데이트 포함)
   */
  private static createClearServer(userId: string) {
    return async () => {
      try {
        await clearCartItemsApi(userId);
        // React Query 캐시 초기화
        queryClient.setQueryData(cartKeys.items(userId), []);
        queryClient.invalidateQueries({ queryKey: cartKeys.items(userId) });
      } catch (error) {
        console.error("Failed to clear cart on server:", error);
        throw error;
      }
    };
  }

  /**
   * 장바구니 아이템 즉시 업데이트
   * 로컬 스토리지 + 서버 + React Query 캐시를 모두 동기화합니다.
   */
  static async updateItemsImmediate(
    items: CartItem[],
    userId?: string
  ): Promise<void> {
    const syncToServer = userId ? this.createSyncToServer(userId) : undefined;
    await cartSyncService.updateItems(items, userId, syncToServer);
  }

  /**
   * 장바구니 강제 동기화
   * 즉시 동기화합니다.
   * 로컬 스토리지 + 서버 + React Query 캐시를 모두 동기화합니다.
   */
  static async forceSync(items: CartItem[], userId?: string): Promise<void> {
    const syncToServer = userId ? this.createSyncToServer(userId) : undefined;
    await cartSyncService.updateItems(items, userId, syncToServer);
  }

  /**
   * 장바구니 초기화
   * 로컬 스토리지 + 서버 + React Query 캐시를 모두 초기화합니다.
   */
  static async clear(userId?: string): Promise<void> {
    const syncToServer = userId ? this.createClearServer(userId) : undefined;
    await cartSyncService.clear(userId, syncToServer);
  }
}
