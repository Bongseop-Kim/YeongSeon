import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePopup, usePopupChild } from "@/shared/hooks/usePopup";

const originalOpener = window.opener;
let closeSpy: ReturnType<typeof vi.spyOn> | null = null;
let openSpy: { mockRestore: () => void } | null = null;

afterEach(() => {
  Object.defineProperty(window, "opener", {
    configurable: true,
    value: originalOpener,
  });
  closeSpy?.mockRestore();
  closeSpy = null;
  openSpy?.mockRestore();
  openSpy = null;
});

describe("usePopup", () => {
  it("팝업을 열고 닫는다", () => {
    const close = vi.fn();
    openSpy = vi.spyOn(window, "open").mockReturnValue({
      close,
    } as unknown as Window);

    const { result } = renderHook(() => usePopup());

    act(() => {
      result.current.openPopup("/test", "coupon", {
        width: 500,
        height: 700,
        scrollbars: false,
        resizable: true,
      });
    });

    expect(openSpy).toHaveBeenCalledWith(
      "/test",
      "coupon",
      "width=500,height=700,left=200,top=100,scrollbars=no,resizable=yes",
    );
    expect(result.current.popup).not.toBeNull();

    act(() => {
      result.current.closePopup();
    });

    expect(close).toHaveBeenCalled();
    expect(result.current.popup).toBeNull();
  });
});

describe("usePopupChild", () => {
  it("부모 윈도우에 메시지를 전달하고 닫는다", () => {
    const postMessage = vi.fn();
    closeSpy = vi.spyOn(window, "close").mockImplementation(() => {});
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
    });

    const { result } = renderHook(() => usePopupChild());

    act(() => {
      result.current.postMessageAndClose({ ok: true });
    });

    expect(postMessage).toHaveBeenCalledWith(
      { ok: true },
      window.location.origin,
    );
    expect(closeSpy).toHaveBeenCalled();
    expect(postMessage.mock.invocationCallOrder[0]).toBeLessThan(
      closeSpy.mock.invocationCallOrder[0],
    );
  });
});
