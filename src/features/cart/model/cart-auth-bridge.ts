import { useCartStore } from "@/store/cart";
import { cartSyncService } from "./cart-sync.service";
import { CartSyncManager } from "./cart-sync-manager";
import { getCartItems } from "../api/cart.api";
import { cartLocalService } from "./cart-local.service";
import { queryClient } from "@/lib/query-client";
import { cartKeys } from "../api/cart.query";
import type { CartItem } from "@/types/cart";

/**
 * userId별 장바구니 초기화 락
 * 동시에 여러 번 초기화가 호출되어도 한 번만 실행되도록 보장
 * 게스트는 "guest" 키를 사용하여 undefined 대신 명시적으로 관리
 */
const GUEST_USER_ID = "guest" as const;
const cartInitializationLocks = new Map<string, Promise<void>>();

/**
 * userId를 락 키로 변환 (undefined → "guest")
 */
function getLockKey(userId: string | undefined): string {
  return userId ?? GUEST_USER_ID;
}

/**
 * Cart-Auth Bridge
 * userId 변화에 반응하여 장바구니를 초기화/병합하는 서비스
 *
 * Auth 이벤트 문자열("SIGNED_IN", "INITIAL_SESSION" 등)을 모르고,
 * 오직 userId의 변화만 감지하여 동작합니다.
 */
export class CartAuthBridge {
  /**
   * userId 변화에 따라 장바구니 초기화/병합
   *
   * @param newUserId 새로운 userId (undefined면 게스트)
   * @param previousUserId 이전 userId (undefined면 게스트)
   */
  static async handleUserIdChange(
    newUserId: string | undefined,
    previousUserId: string | undefined
  ): Promise<void> {
    // userId가 변경되지 않았으면 무시
    if (newUserId === previousUserId) {
      return;
    }

    // 이전 사용자 정리
    if (previousUserId) {
      const previousLockKey = getLockKey(previousUserId);
      cartInitializationLocks.delete(previousLockKey);
      await cartLocalService.clearUserCache(previousUserId);
      cartLocalService.clearMergeLock(previousUserId);
      // React Query 캐시 정리 (이전 사용자)
      queryClient.removeQueries({ queryKey: cartKeys.items(previousUserId) });
    } else {
      // 게스트에서 로그인으로 전환 시 게스트 락 해제
      cartInitializationLocks.delete(GUEST_USER_ID);
    }

    // 대기 중인 동기화 취소
    cartSyncService.cancelPendingSync();

    // 새로운 userId에 대한 장바구니 초기화
    await this.initializeCartForUser(newUserId);
  }

  /**
   * 특정 userId에 대한 장바구니 초기화
   *
   * @param userId 사용자 ID (undefined면 게스트)
   */
  private static async initializeCartForUser(
    userId: string | undefined
  ): Promise<void> {
    const lockKey = getLockKey(userId);

    // 이미 초기화 중이면 기존 Promise 반환
    const existingPromise = cartInitializationLocks.get(lockKey);
    if (existingPromise) {
      return existingPromise;
    }

    // 새로운 초기화 Promise 생성
    const initPromise = (async () => {
      try {
        if (userId) {
          // 로그인 상태: 서버 장바구니 fetch 및 병합
          await this.initializeCartForLoggedInUser(userId);
        } else {
          // 비로그인 상태: 게스트 카트만 로드
          await this.initializeCartForGuest();
        }
      } catch (error) {
        console.error("Failed to initialize cart:", error);
        // 최종 에러 발생 시 게스트 카트만 로드
        try {
          await this.initializeCartForGuest();
        } catch (initError) {
          console.error("게스트 카트 초기화도 실패:", initError);
          // 완전 실패 시 빈 장바구니로 설정
          useCartStore.getState().syncItems([]);
        }
      } finally {
        // 초기화 완료 후 락 해제
        cartInitializationLocks.delete(lockKey);
      }
    })();

    // 락 저장
    cartInitializationLocks.set(lockKey, initPromise);

    return initPromise;
  }

  /**
   * 로그인 사용자 장바구니 초기화
   * 게스트 카트와 서버 장바구니를 병합합니다.
   */
  private static async initializeCartForLoggedInUser(
    userId: string
  ): Promise<void> {
    // 서버 장바구니 fetch
    let serverItems: CartItem[] = [];
    try {
      serverItems = await getCartItems(userId);
    } catch (error) {
      console.error("서버 장바구니 조회 실패:", error);
      // 서버 조회 실패 시 유저 캐시 또는 빈 배열 사용
      const cacheItems = await cartLocalService.getUserCacheItems(userId);
      useCartStore.getState().syncItems(cacheItems);
      return;
    }

    // 게스트 카트와 서버 카트 병합
    let mergedItems: CartItem[];
    try {
      mergedItems = await cartSyncService.mergeOnSignIn(serverItems, userId);
    } catch (error) {
      console.error("장바구니 병합 실패, 서버 데이터만 사용:", error);
      // 병합 실패 시 서버 데이터만 사용
      useCartStore.getState().syncItems(serverItems);
      return;
    }

    // 병합된 결과를 서버에 저장 (강제 동기화)
    try {
      await CartSyncManager.forceSync(mergedItems, userId);
      // Zustand store 업데이트
      useCartStore.getState().syncItems(mergedItems);
    } catch (error) {
      console.error("서버 동기화 실패, 서버 상태로 롤백:", error);
      // 서버 동기화 실패 시 서버 상태로 롤백
      useCartStore.getState().syncItems(serverItems);
      // 에러를 다시 던져서 상위 호출자가 처리할 수 있도록 함
      throw error;
    }
  }

  /**
   * 게스트 장바구니 초기화
   */
  private static async initializeCartForGuest(): Promise<void> {
    await useCartStore.getState().initialize();
  }
}
