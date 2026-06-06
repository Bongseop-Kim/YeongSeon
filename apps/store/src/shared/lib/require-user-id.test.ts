import { describe, expect, it, vi } from "vitest";

const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: getUserMock,
    },
  },
}));

import { requireUserId } from "@/shared/lib/require-user-id";

describe("requireUserId", () => {
  it("로그인된 사용자가 있으면 user.id를 반환한다", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "user-123" } },
    });

    await expect(requireUserId()).resolves.toBe("user-123");
  });

  it("user가 null이면 '로그인 후 이용할 수 있어요.' 에러를 throw한다", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
    });

    await expect(requireUserId()).rejects.toThrow(
      "로그인 후 이용할 수 있어요.",
    );
  });

  it("user가 undefined이면 '로그인 후 이용할 수 있어요.' 에러를 throw한다", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: undefined },
    });

    await expect(requireUserId()).rejects.toThrow(
      "로그인 후 이용할 수 있어요.",
    );
  });
});
