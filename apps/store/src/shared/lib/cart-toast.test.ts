import { describe, expect, it, vi } from "vitest";
import { showCartAddedToast } from "@/shared/lib/cart-toast";
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
});
