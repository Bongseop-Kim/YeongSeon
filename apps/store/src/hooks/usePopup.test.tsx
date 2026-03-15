import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePopup, usePopupChild } from "@/hooks/usePopup";

describe("usePopup", () => {
  it("팝업을 열고 닫는다", () => {
    const close = vi.fn();
    const open = vi.spyOn(window, "open").mockReturnValue({
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

    expect(open).toHaveBeenCalledWith(
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
    open.mockRestore();
  });
});

describe("usePopupChild", () => {
  it("부모 윈도우에 메시지를 전달하고 닫는다", () => {
    const postMessage = vi.fn();
    const close = vi.spyOn(window, "close").mockImplementation(() => {});
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
    expect(close).toHaveBeenCalled();
    close.mockRestore();
  });
});
