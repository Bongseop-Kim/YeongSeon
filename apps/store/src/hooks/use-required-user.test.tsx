import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRequiredUser } from "@/hooks/use-required-user";

const authState = { user: null as { id: string } | null };

vi.mock("@/store/auth", () => ({
  useAuthStore: () => authState,
}));

describe("useRequiredUser", () => {
  it("user.id가 없으면 에러를 던진다", () => {
    authState.user = null;
    expect(() => renderHook(() => useRequiredUser())).toThrow(
      "로그인이 필요합니다.",
    );
  });

  it("user.id가 있으면 userId string을 반환한다", () => {
    authState.user = { id: "user-123" };
    const { result } = renderHook(() => useRequiredUser());
    expect(result.current).toBe("user-123");
  });
});
