import { cartLocalService } from "./cart-local.service";
import { mergeCartItems } from "../utils/mergeCartItems";
import type { CartItem } from "@/features/cart/types/cart";

/**
 * 장바구니 동기화 서비스
 * 로컬과 서버 간의 동기화를 관리
 */
export class CartSyncService {
  /**
   * 로그인 시 게스트 카트와 서버 장바구니 병합
   * 병합 중복 방지 로직 포함
   *
   * @param serverItems 서버 장바구니 아이템
   * @param userId 사용자 ID
   * @returns 병합된 장바구니 아이템
   */
  async mergeOnSignIn(
    serverItems: CartItem[],
    userId: string
  ): Promise<CartItem[]> {
    // 병합 중복 방지: 이미 병합 락이 있으면 기존 서버 데이터 반환
    if (cartLocalService.hasMergeLock(userId)) {
      console.log(
        "이미 병합이 진행 중이거나 완료되었습니다. 서버 데이터를 사용합니다."
      );
      return serverItems;
    }

    // 병합 락 설정
    cartLocalService.setMergeLock(userId);

    try {
      // 게스트 카트 가져오기
      const guestItems = await cartLocalService.getGuestItems();

      // 병합
      const mergedItems = mergeCartItems(guestItems, serverItems);

      // 병합 성공 후 게스트 카트 즉시 클리어 (중복 병합 방지)
      await cartLocalService.clearGuest();

      // 유저 캐시에 저장 (선택적, 빠른 렌더용)
      await cartLocalService.setUserCacheItems(userId, mergedItems);

      return mergedItems;
    } catch (error) {
      console.error("장바구니 병합 실패:", error);
      throw error;
    } finally {
      // 병합 완료 후 락 해제 (성공/실패 관계없이 항상 실행)
      cartLocalService.clearMergeLock(userId);
    }
  }

  /**
   * 장바구니 아이템 즉시 업데이트
   * 비로그인: 게스트 카트만 업데이트
   * 로그인: 유저 캐시 업데이트 + 서버 동기화 (즉시)
   */
  async updateItems(
    items: CartItem[],
    userId?: string,
    syncToServer?: (items: CartItem[]) => Promise<void>
  ): Promise<void> {
    if (userId) {
      // 로그인 상태: 유저 캐시에 저장
      await cartLocalService.setUserCacheItems(userId, items);
      // 서버 동기화 즉시 실행
      if (syncToServer) {
        await syncToServer(items);
      }
    } else {
      // 비로그인 상태: 게스트 카트에만 저장
      await cartLocalService.setGuestItems(items);
    }
  }

  /**
   * 장바구니 아이템 즉시 업데이트 (기존 호환성 유지)
   * @deprecated updateItems를 사용하세요
   */
  async updateItemsImmediate(
    items: CartItem[],
    userId?: string,
    syncToServer?: (items: CartItem[]) => Promise<void>
  ): Promise<void> {
    return this.updateItems(items, userId, syncToServer);
  }

  /**
   * 강제 동기화 (즉시)
   * @deprecated updateItems를 사용하세요
   */
  async forceSync(
    items: CartItem[],
    userId?: string,
    syncToServer?: (items: CartItem[]) => Promise<void>
  ): Promise<void> {
    return this.updateItems(items, userId, syncToServer);
  }

  /**
   * 장바구니 초기화
   * 비로그인: 게스트 카트만 초기화
   * 로그인: 유저 캐시 + 서버 초기화
   */
  async clear(
    userId?: string,
    syncToServer?: () => Promise<void>
  ): Promise<void> {
    if (userId) {
      // 로그인 상태: 유저 캐시 초기화
      await cartLocalService.clearUserCache(userId);
      // 서버도 초기화
      if (syncToServer) {
        try {
          await syncToServer();
        } catch (error) {
          console.error("Failed to clear cart on server:", error);
        }
      }
    } else {
      // 비로그인 상태: 게스트 카트만 초기화
      await cartLocalService.clearGuest();
    }
  }
}

// 싱글톤 인스턴스
export const cartSyncService = new CartSyncService();
