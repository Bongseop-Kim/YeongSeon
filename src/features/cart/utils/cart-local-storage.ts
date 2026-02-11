import type { CartItem } from "@/features/cart/types/view/cart";

const GUEST_CART_KEY = "cart_guest";
const USER_CACHE_KEY_PREFIX = "cart_cache_user_";
const MERGE_LOCK_KEY_PREFIX = "merge_lock_";

const isQuotaExceededError = (error: unknown): error is DOMException =>
  error instanceof DOMException && error.name === "QuotaExceededError";

const isProductCartItem = (data: Record<string, unknown>): boolean => {
  const product = data.product as Record<string, unknown> | undefined;
  return (
    data.type === "product" &&
    typeof data.id === "string" &&
    typeof data.quantity === "number" &&
    !!product &&
    typeof product.id === "number"
  );
};

const isReformCartItem = (data: Record<string, unknown>): boolean => {
  const reformData = data.reformData as Record<string, unknown> | undefined;
  return (
    data.type === "reform" &&
    typeof data.id === "string" &&
    typeof data.quantity === "number" &&
    !!reformData &&
    typeof reformData.cost === "number"
  );
};

const isCartItem = (data: unknown): data is CartItem => {
  if (!data || typeof data !== "object") return false;
  const item = data as Record<string, unknown>;
  return isProductCartItem(item) || isReformCartItem(item);
};

const isValidCartItems = (data: unknown): data is CartItem[] =>
  Array.isArray(data) && data.every(isCartItem);

const validateUserId = (userId: string): string => {
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    throw new Error("Invalid userId");
  }
  return userId;
};

const safeLocalStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to get ${key} from localStorage:`, error);
    return null;
  }
};

const safeLocalStorageSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw new Error("저장 공간이 부족합니다.");
    }
    console.error(`Failed to set ${key} in localStorage:`, error);
    throw error;
  }
};

const safeLocalStorageRemove = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage:`, error);
    throw error;
  }
};

const parseStoredItems = (stored: string | null): CartItem[] => {
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];

    if (!isValidCartItems(rawItems)) {
      console.warn("Invalid cart data format");
      return [];
    }

    return rawItems;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn("Failed to parse cart data from localStorage");
      return [];
    }
    throw error;
  }
};

const buildUserCacheKey = (userId: string): string =>
  `${USER_CACHE_KEY_PREFIX}${validateUserId(userId)}`;

const buildMergeLockKey = (userId: string): string =>
  `${MERGE_LOCK_KEY_PREFIX}${validateUserId(userId)}`;

export const getGuestItems = async (): Promise<CartItem[]> => {
  const stored = safeLocalStorageGet(GUEST_CART_KEY);
  return parseStoredItems(stored);
};

export const setGuestItems = async (items: CartItem[]): Promise<void> => {
  if (!isValidCartItems(items)) {
    throw new Error("Invalid cart items");
  }

  const serialized = JSON.stringify({ items });
  safeLocalStorageSet(GUEST_CART_KEY, serialized);
};

export const clearGuest = async (): Promise<void> => {
  safeLocalStorageRemove(GUEST_CART_KEY);
};

/**
 * @deprecated 더 이상 사용되지 않습니다.
 * 단순화된 장바구니 동기화 전략으로 인해 user cache는 필요하지 않습니다.
 */
export const getUserCacheItems = async (
  userId: string
): Promise<CartItem[]> => {
  const key = buildUserCacheKey(userId);
  const stored = safeLocalStorageGet(key);
  return parseStoredItems(stored);
};

/**
 * 사용자별 장바구니 캐시 저장
 * React Query 캐시와 함께 사용하여 오프라인 지원을 제공합니다.
 */
export const setUserCacheItems = async (
  userId: string,
  items: CartItem[]
): Promise<void> => {
  if (!isValidCartItems(items)) {
    throw new Error("Invalid cart items");
  }

  const key = buildUserCacheKey(userId);
  safeLocalStorageSet(key, JSON.stringify({ items }));
};

/**
 * 사용자별 장바구니 캐시 삭제
 * 로그아웃 시 이전 사용자의 캐시를 정리하는데 사용됩니다.
 */
export const clearUserCache = async (userId: string): Promise<void> => {
  const key = buildUserCacheKey(userId);
  safeLocalStorageRemove(key);
};

export const clearMergeLock = (userId: string): void => {
  const key = buildMergeLockKey(userId);
  safeLocalStorageRemove(key);
};
