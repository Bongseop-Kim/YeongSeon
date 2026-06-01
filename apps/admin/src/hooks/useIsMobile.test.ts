import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "@/hooks/useIsMobile";

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const mediaQuery = {
    get matches() {
      return matches;
    },
    addEventListener: vi.fn((_event: "change", listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_event: "change", listener: () => void) => {
      listeners.delete(listener);
    }),
  };

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mediaQuery),
  );

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("useIsMobile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("matchMedia가 없으면 false를 반환한다", () => {
    vi.stubGlobal("matchMedia", undefined);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("미디어 쿼리가 match되면 mobile로 판단한다", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("미디어 쿼리 변경을 반영한다", () => {
    const controller = mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    act(() => controller.setMatches(true));

    expect(result.current).toBe(true);
  });
});
