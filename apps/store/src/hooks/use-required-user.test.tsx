import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRequiredUser } from "@/hooks/use-required-user";

const authState = {
  user: null as { id: string } | null,
  initialized: false,
};

vi.mock("@/store/auth", () => ({
  useAuthStore: () => authState,
}));

describe("useRequiredUser", () => {
  beforeEach(() => {
    authState.user = null;
    authState.initialized = false;
  });

  it("인증 초기화 전이면 bootstrap 상태 에러를 던진다", () => {
    expect(() => renderHook(() => useRequiredUser())).toThrow(
      "인증 상태를 확인하는 중입니다.",
    );
  });

  it("user.id가 없으면 에러를 던진다", () => {
    authState.initialized = true;
    expect(() => renderHook(() => useRequiredUser())).toThrow(
      "로그인이 필요합니다.",
    );
  });

  it("user.id가 있으면 userId string을 반환한다", () => {
    authState.initialized = true;
    authState.user = { id: "user-123" };
    const { result } = renderHook(() => useRequiredUser());
    expect(result.current).toBe("user-123");
  });
});
