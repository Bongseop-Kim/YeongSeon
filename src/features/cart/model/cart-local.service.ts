import type { CartItem } from "@/features/cart/types/cart";

const GUEST_CART_KEY = "cart_guest";
const USER_CACHE_KEY_PREFIX = "cart_cache_user_";
const MERGE_LOCK_KEY_PREFIX = "merge_lock_";

/**
 * 로컬 스토리지 기반 장바구니 관리 서비스
 * 게스트 카트와 유저 캐시를 분리하여 관리
 */
export class CartLocalService {
  /**
   * 게스트 카트 조회 (비회원 장바구니)
   */
  async getGuestItems(): Promise<CartItem[]> {
    try {
      const stored = localStorage.getItem(GUEST_CART_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return parsed.items || [];
    } catch (error) {
      console.error("Failed to load guest cart from localStorage:", error);
      return [];
    }
  }

  /**
   * 게스트 카트 저장
   */
  async setGuestItems(items: CartItem[]): Promise<void> {
    try {
      const data = { items };
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save guest cart to localStorage:", error);
      throw error;
    }
  }

  /**
   * 게스트 카트 초기화
   */
  async clearGuest(): Promise<void> {
    try {
      localStorage.removeItem(GUEST_CART_KEY);
    } catch (error) {
      console.error("Failed to clear guest cart from localStorage:", error);
      throw error;
    }
  }

  /**
   * 유저 캐시 조회 (로그인 사용자의 빠른 렌더용 캐시)
   */
  async getUserCacheItems(userId: string): Promise<CartItem[]> {
    try {
      const key = `${USER_CACHE_KEY_PREFIX}${userId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return parsed.items || [];
    } catch (error) {
      console.error("Failed to load user cache from localStorage:", error);
      return [];
    }
  }

  /**
   * 유저 캐시 저장
   */
  async setUserCacheItems(userId: string, items: CartItem[]): Promise<void> {
    try {
      const key = `${USER_CACHE_KEY_PREFIX}${userId}`;
      const data = { items };
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save user cache to localStorage:", error);
      throw error;
    }
  }

  /**
   * 유저 캐시 삭제 (로그아웃 시)
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const key = `${USER_CACHE_KEY_PREFIX}${userId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to clear user cache from localStorage:", error);
      throw error;
    }
  }

  /**
   * 병합 락 설정 (중복 병합 방지)
   */
  setMergeLock(userId: string): void {
    const key = `${MERGE_LOCK_KEY_PREFIX}${userId}`;
    localStorage.setItem(key, Date.now().toString());
  }

  /**
   * 병합 락 확인
   */
  hasMergeLock(userId: string): boolean {
    const key = `${MERGE_LOCK_KEY_PREFIX}${userId}`;
    const lockValue = localStorage.getItem(key);
    if (!lockValue) return false;

    // 5분 이내의 락만 유효 (오래된 락은 무시)
    const lockTime = parseInt(lockValue, 10);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lockTime > fiveMinutesAgo;
  }

  /**
   * 병합 락 해제
   */
  clearMergeLock(userId: string): void {
    const key = `${MERGE_LOCK_KEY_PREFIX}${userId}`;
    localStorage.removeItem(key);
  }

  /**
   * 호환성을 위한 메서드 (기존 코드 대응)
   * 비로그인 상태에서만 사용 (게스트 카트 반환)
   */
  async getItems(): Promise<CartItem[]> {
    return this.getGuestItems();
  }

  /**
   * 호환성을 위한 메서드 (기존 코드 대응)
   * 비로그인 상태에서만 사용 (게스트 카트 저장)
   */
  async setItems(items: CartItem[]): Promise<void> {
    return this.setGuestItems(items);
  }

  /**
   * 호환성을 위한 메서드 (기존 코드 대응)
   * 비로그인 상태에서만 사용 (게스트 카트 초기화)
   */
  async clear(): Promise<void> {
    return this.clearGuest();
  }
}

// 싱글톤 인스턴스
export const cartLocalService = new CartLocalService();
