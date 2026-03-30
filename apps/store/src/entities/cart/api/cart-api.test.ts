import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCartItems,
  getCartItems,
  setCartItems,
} from "@/entities/cart/api/cart-api";

const { getSession, rpc, deleteFn, eq } = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn(),
  deleteFn: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession,
    },
    rpc,
    from: vi.fn(() => ({
      delete: deleteFn,
    })),
  },
}));

describe("cart-api ownership checks", () => {
  beforeEach(() => {
    getSession.mockReset();
    rpc.mockReset();
    deleteFn.mockReset();
    eq.mockReset();

    getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "session-user",
          },
        },
      },
    });
    deleteFn.mockReturnValue({
      eq,
    });
    eq.mockResolvedValue({ error: null });
  });

  it("getCartItems는 세션 사용자와 다른 userId를 거부한다", async () => {
    await expect(getCartItems("other-user")).rejects.toThrow(
      "권한이 없습니다. 로그인한 사용자와 요청한 userId가 일치하지 않습니다.",
    );

    expect(rpc).not.toHaveBeenCalled();
  });

  it("setCartItems는 세션 사용자와 다른 userId를 거부한다", async () => {
    await expect(setCartItems("other-user", [])).rejects.toThrow(
      "권한이 없습니다. 로그인한 사용자와 요청한 userId가 일치하지 않습니다.",
    );

    expect(rpc).not.toHaveBeenCalled();
  });

  it("clearCartItems는 세션 사용자와 다른 userId를 거부한다", async () => {
    await expect(clearCartItems("other-user")).rejects.toThrow(
      "권한이 없습니다. 로그인한 사용자와 요청한 userId가 일치하지 않습니다.",
    );

    expect(deleteFn).not.toHaveBeenCalled();
    expect(eq).not.toHaveBeenCalled();
  });
});
