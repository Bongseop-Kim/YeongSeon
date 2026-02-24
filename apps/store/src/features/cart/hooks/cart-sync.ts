import type { CartItem } from "@/features/cart/types/view/cart";
import { cartKeys } from "@/features/cart/api/cart-query";

interface QueryClientLike {
  setQueryData: (key: readonly unknown[], value: CartItem[]) => void;
}

interface SyncItemsOptions {
  isLoggedIn: boolean;
  userId?: string;
  queryClient: QueryClientLike;
  nextItems: CartItem[];
  previousItems: CartItem[];
  setGuestItems: (items: CartItem[]) => Promise<void>;
  setCartItems: (items: CartItem[]) => Promise<void>;
  onError: (message: string) => void;
  errorMessage: string;
}

interface ClearItemsOptions {
  isLoggedIn: boolean;
  userId?: string;
  queryClient: QueryClientLike;
  previousItems: CartItem[];
  clearGuest: () => Promise<void>;
  clearServerCart: () => Promise<void>;
  setGuestItems: (items: CartItem[]) => Promise<void>;
  onError: (message: string) => void;
  errorMessage: string;
}

const setItemsToCache = (
  queryClient: QueryClientLike,
  isLoggedIn: boolean,
  userId: string | undefined,
  items: CartItem[],
) => {
  if (isLoggedIn && userId) {
    queryClient.setQueryData(cartKeys.items(userId), items);
    return;
  }
  queryClient.setQueryData(cartKeys.guest(), items);
};

const rollbackItems = async (
  queryClient: QueryClientLike,
  isLoggedIn: boolean,
  userId: string | undefined,
  previousItems: CartItem[],
  setGuestItems: (items: CartItem[]) => Promise<void>,
) => {
  setItemsToCache(queryClient, isLoggedIn, userId, previousItems);
  if (!isLoggedIn) {
    await setGuestItems(previousItems);
  }
};

export const syncCartItemsWithRollback = async ({
  isLoggedIn,
  userId,
  queryClient,
  nextItems,
  previousItems,
  setGuestItems,
  setCartItems,
  onError,
  errorMessage,
}: SyncItemsOptions) => {
  try {
    setItemsToCache(queryClient, isLoggedIn, userId, nextItems);

    if (isLoggedIn && userId) {
      await setCartItems(nextItems);
      return;
    }

    await setGuestItems(nextItems);
  } catch (error) {
    await rollbackItems(queryClient, isLoggedIn, userId, previousItems, setGuestItems);
    onError(errorMessage);
    throw error;
  }
};

export const clearCartItemsWithRollback = async ({
  isLoggedIn,
  userId,
  queryClient,
  previousItems,
  clearGuest,
  clearServerCart,
  setGuestItems,
  onError,
  errorMessage,
}: ClearItemsOptions) => {
  try {
    setItemsToCache(queryClient, isLoggedIn, userId, []);

    if (isLoggedIn && userId) {
      await clearServerCart();
      return;
    }

    await clearGuest();
  } catch (error) {
    await rollbackItems(queryClient, isLoggedIn, userId, previousItems, setGuestItems);
    onError(errorMessage);
    throw error;
  }
};
