import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOnboarding } from "@/features/design/hooks/use-onboarding";

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

describe("useOnboarding", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createStorage(),
    });
    window.localStorage.clear();
  });

  it("로컬스토리지 완료 정보가 없으면 온보딩을 노출한다", async () => {
    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.showOnboarding).toBe(true);
    });
  });

  it("완료 처리 시 스토리지에 저장하고 온보딩을 닫는다", async () => {
    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.showOnboarding).toBe(true);
    });

    act(() => {
      result.current.completeOnboarding();
    });

    expect(window.localStorage.getItem("ai-design-onboarding-completed")).toBe(
      "true",
    );
    expect(result.current.showOnboarding).toBe(false);
  });

  it("localStorage 접근이 실패해도 폴백 동작한다", async () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementationOnce(() => {
        throw new Error("denied");
      });

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.showOnboarding).toBe(true);
    });

    getItemSpy.mockRestore();
  });
});
