import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCartAuthSync } from "@/features/cart/hooks/useCartAuthSync";
import { createCartItem } from "@/test/fixtures";

const {
  ensureQueryData,
  setQueryData,
  invalidateQueries,
  mutateAsync,
  getCartItems,
  clearGuest,
  clearMergeLock,
  clearUserCache,
  getGuestItems,
  error,
} = vi.hoisted(() => ({
  ensureQueryData: vi.fn(),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  mutateAsync: vi.fn(),
  getCartItems: vi.fn(),
  clearGuest: vi.fn(),
  clearMergeLock: vi.fn(),
  clearUserCache: vi.fn(),
  getGuestItems: vi.fn(),
  error: vi.fn(),
}));

const authState = {
  user: null as { id: string } | null,
  initialized: true,
};

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    ensureQueryData,
    setQueryData,
    invalidateQueries,
  }),
}));

vi.mock("@/shared/store/auth", () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) =>
    selector(authState),
}));

vi.mock("@/features/cart/api/cart-query", () => ({
  cartKeys: {
    items: (userId?: string) => ["cart", "items", userId],
    guest: () => ["cart", "guest"],
  },
  useSetCartItems: () => ({
    mutateAsync,
  }),
}));

vi.mock("@/features/cart/api/cart-api", () => ({
  getCartItems,
}));

vi.mock("@/features/cart/utils/cart-local-storage", () => ({
  clearGuest,
  clearMergeLock,
  clearUserCache,
  getGuestItems,
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: {
    error,
  },
}));

describe("useCartAuthSync", () => {
  beforeEach(() => {
    authState.user = null;
    authState.initialized = true;
    ensureQueryData.mockReset();
    setQueryData.mockReset();
    invalidateQueries.mockReset();
    mutateAsync.mockReset();
    getCartItems.mockReset();
    clearGuest.mockReset();
    clearMergeLock.mockReset();
    clearUserCache.mockReset();
    getGuestItems.mockReset();
    error.mockReset();
  });

  it("로그아웃 상태에서는 guest 장바구니를 로드한다", async () => {
    authState.user = { id: "user-1" };
    ensureQueryData.mockResolvedValueOnce([]);
    getGuestItems.mockResolvedValueOnce([]);

    const { rerender } = renderHook(() => useCartAuthSync());

    await waitFor(() => {
      expect(ensureQueryData).toHaveBeenCalled();
    });

    const guestItems = [createCartItem()];
    authState.user = null;
    getGuestItems.mockResolvedValueOnce(guestItems);
    rerender();

    await waitFor(() => {
      expect(setQueryData).toHaveBeenCalledWith(["cart", "guest"], guestItems);
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["cart", "guest"],
    });
  });

  it("로그인 시 guest 장바구니를 서버로 업로드하고 이전 사용자를 정리한다", async () => {
    authState.user = { id: "user-1" };
    ensureQueryData.mockResolvedValueOnce([]);
    getGuestItems.mockResolvedValueOnce([]);

    const { rerender } = renderHook(() => useCartAuthSync());

    await waitFor(() => {
      expect(ensureQueryData).toHaveBeenCalledWith({
        queryKey: ["cart", "items", "user-1"],
        queryFn: expect.any(Function),
      });
    });

    const guestItems = [createCartItem()];
    authState.user = { id: "user-2" };
    ensureQueryData.mockResolvedValueOnce([{ id: "server-item" }]);
    getGuestItems.mockResolvedValueOnce(guestItems);
    mutateAsync.mockResolvedValueOnce(undefined);

    rerender();

    await waitFor(() => {
      expect(clearUserCache).toHaveBeenCalledWith("user-1");
    });
    expect(clearMergeLock).toHaveBeenCalledWith("user-1");
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["cart", "items", "user-1"],
    });
    expect(mutateAsync).toHaveBeenCalledWith(guestItems);
    expect(setQueryData).toHaveBeenCalledWith(
      ["cart", "items", "user-2"],
      guestItems,
    );
    expect(clearGuest).toHaveBeenCalled();
  });

  it("서버 조회 실패와 업로드 실패 시 에러를 표시하고 서버 장바구니로 폴백한다", async () => {
    authState.user = { id: "user-3" };
    ensureQueryData.mockRejectedValueOnce(new Error("server failed"));

    renderHook(() => useCartAuthSync());

    await waitFor(() => {
      expect(error).toHaveBeenCalledWith("장바구니를 불러오지 못했어요.");
    });

    authState.user = { id: "user-4" };
    ensureQueryData.mockResolvedValueOnce([{ id: "server-item" }]);
    getGuestItems.mockResolvedValueOnce([createCartItem()]);
    mutateAsync.mockRejectedValueOnce(new Error("upload failed"));

    const { rerender } = renderHook(() => useCartAuthSync());
    rerender();

    await waitFor(() => {
      expect(setQueryData).toHaveBeenCalledWith(
        ["cart", "items", "user-4"],
        [{ id: "server-item" }],
      );
    });
    expect(error).toHaveBeenCalledWith(
      "로컬 장바구니를 서버로 업로드하지 못했습니다. 서버 장바구니를 사용합니다.",
    );
  });
});
