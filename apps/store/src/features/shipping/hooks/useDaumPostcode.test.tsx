import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDaumPostcode } from "@/features/shipping/hooks/useDaumPostcode";

beforeEach(() => {
  Object.defineProperty(window, "daum", {
    configurable: true,
    value: {
      Postcode: vi.fn(),
    },
  });
});

afterEach(() => {
  Object.defineProperty(window, "daum", {
    configurable: true,
    value: undefined,
  });
});

describe("useDaumPostcode", () => {
  it("이미 로드된 Postcode API가 있으면 바로 loaded 상태가 된다", () => {
    const { result } = renderHook(() => useDaumPostcode());
    expect(result.current.isLoaded).toBe(true);
  });

  it("스크립트를 주입하고 onload/onerror/cleanup을 처리한다", () => {
    Object.defineProperty(window, "daum", {
      configurable: true,
      value: undefined,
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result, unmount } = renderHook(() => useDaumPostcode());
    const script = document.head.querySelector(
      'script[src*="postcode.v2.js"]',
    ) as HTMLScriptElement | null;

    expect(script).not.toBeNull();
    const scriptElement = script as HTMLScriptElement;
    expect(scriptElement.src).toContain("postcode.v2.js");

    act(() => {
      scriptElement.onload?.(new Event("load"));
    });
    expect(result.current.isLoaded).toBe(true);

    act(() => {
      scriptElement.onerror?.(new Event("error"));
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "Daum Postcode API 스크립트 로딩에 실패했습니다.",
    );

    unmount();
    expect(document.head.contains(scriptElement)).toBe(false);
    errorSpy.mockRestore();
  });
});
