// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import {
  NAVIGATE_TO_CART_EVENT,
  showCartAddedToast,
} from "@/shared/lib/cart-toast";
import { toast } from "@/shared/lib/toast";

vi.mock("@/shared/lib/toast", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("showCartAddedToast", () => {
  it("장바구니 보기 액션이 있는 성공 토스트를 표시한다", () => {
    showCartAddedToast("장바구니에 추가되었습니다.");

    expect(toast.success).toHaveBeenCalledWith("장바구니에 추가되었습니다.", {
      action: {
        label: "장바구니 보기",
        onClick: expect.any(Function),
      },
    });
  });

  it("장바구니 보기 액션은 SPA 내비게이션 이벤트를 발생시킨다", () => {
    const addEventListener = vi.fn();
    window.addEventListener(NAVIGATE_TO_CART_EVENT, addEventListener);
    showCartAddedToast("장바구니에 추가되었습니다.");

    const toastOptions = vi.mocked(toast.success).mock.calls.at(-1)?.[1];
    const action = toastOptions?.action;
    expect(action).toEqual(
      expect.objectContaining({
        label: "장바구니 보기",
        onClick: expect.any(Function),
      }),
    );

    if (!action || typeof action !== "object" || !("onClick" in action)) {
      throw new Error("Toast action is missing");
    }

    const { onClick } = action;
    if (typeof onClick !== "function") {
      throw new Error("Toast action is not clickable");
    }

    (onClick as () => void)();

    expect(addEventListener).toHaveBeenCalledWith(
      expect.objectContaining({ detail: "/cart" }),
    );

    window.removeEventListener(NAVIGATE_TO_CART_EVENT, addEventListener);
  });
});
