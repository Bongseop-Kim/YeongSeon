import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGuest,
  clearMergeLock,
  clearUserCache,
  getGuestItems,
  getUserCacheItems,
  setGuestItems,
  setUserCacheItems,
} from "@/features/cart/utils/cart-local-storage";
import { createCartItem, createReformCartItem } from "@/test/fixtures";

const { warnSpy, errorSpy } = vi.hoisted(() => ({
  warnSpy: vi.fn(),
  errorSpy: vi.fn(),
}));

const createStorage = () => {
  let store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store = new Map<string, string>();
    }),
  };
};

describe("cart-local-storage", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createStorage(),
    });
    window.localStorage.clear();
    vi.restoreAllMocks();
    warnSpy.mockReset();
    errorSpy.mockReset();
    vi.spyOn(console, "warn").mockImplementation(warnSpy);
    vi.spyOn(console, "error").mockImplementation(errorSpy);
  });

  it("guest 아이템을 저장/조회/삭제한다", async () => {
    const items = [createCartItem(), createReformCartItem()];

    await setGuestItems(items);
    await expect(getGuestItems()).resolves.toEqual(items);

    await clearGuest();
    await expect(getGuestItems()).resolves.toEqual([]);
  });

  it("user cache 아이템을 저장/조회/삭제한다", async () => {
    const items = [createCartItem()];

    await setUserCacheItems("user-1", items);
    await expect(getUserCacheItems("user-1")).resolves.toEqual(items);

    await clearUserCache("user-1");
    await expect(getUserCacheItems("user-1")).resolves.toEqual([]);
  });

  it("merge lock을 삭제한다", () => {
    window.localStorage.setItem("merge_lock_user-1", "1");
    clearMergeLock("user-1");
    expect(window.localStorage.getItem("merge_lock_user-1")).toBeNull();
  });

  it("잘못된 cart item은 저장하지 않는다", async () => {
    await expect(setGuestItems([{ id: 1 }] as never)).rejects.toThrow(
      "Invalid cart items",
    );
    await expect(
      setUserCacheItems("user-1", [{ id: 1 }] as never),
    ).rejects.toThrow("Invalid cart items");
  });

  it("잘못된 userId는 거부한다", async () => {
    await expect(getUserCacheItems("")).rejects.toThrow("Invalid userId");
    await expect(setUserCacheItems(" ", [])).rejects.toThrow("Invalid userId");
    await expect(clearUserCache("")).rejects.toThrow("Invalid userId");
  });

  it("잘못된 저장 포맷과 파싱 실패는 빈 배열로 처리한다", async () => {
    window.localStorage.setItem(
      "cart_guest",
      JSON.stringify({ items: [{ bad: true }] }),
    );
    await expect(getGuestItems()).resolves.toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith("Invalid cart data format");

    window.localStorage.setItem("cart_guest", "{");
    await expect(getGuestItems()).resolves.toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to parse cart data from localStorage",
    );
  });

  it("storage 접근 실패와 quota exceeded를 처리한다", async () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementationOnce(() => {
      throw new Error("denied");
    });
    await expect(getGuestItems()).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to get cart_guest from localStorage:",
      expect.any(Error),
    );

    vi.spyOn(window.localStorage, "setItem").mockImplementationOnce(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    await expect(setGuestItems([])).rejects.toThrow("저장 공간이 부족합니다.");
    expect(errorSpy).toHaveBeenCalledTimes(1);

    vi.spyOn(window.localStorage, "removeItem").mockImplementationOnce(() => {
      throw new Error("remove failed");
    });
    await expect(clearGuest()).rejects.toThrow("remove failed");
    expect(errorSpy).toHaveBeenNthCalledWith(
      2,
      "Failed to remove cart_guest from localStorage:",
      expect.any(Error),
    );
  });
});
