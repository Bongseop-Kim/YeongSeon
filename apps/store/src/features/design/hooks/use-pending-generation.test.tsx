import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePendingGeneration } from "@/features/design/hooks/use-pending-generation";

// Zustand 스토어 mock
vi.mock("@/features/design/store/design-chat-store", () => ({
  useDesignChatStore: Object.assign(
    vi.fn((selector: (s: { generationStatus: string }) => unknown) =>
      selector({ generationStatus: "idle" }),
    ),
    {
      getState: () => ({ generationStatus: "idle" }),
    },
  ),
}));

const STORAGE_KEY = "pending_design_generation";

beforeEach(() => {
  localStorage.clear();
});

describe("usePendingGeneration", () => {
  it("localStorage에 항목이 없으면 hasPendingResult가 false다", () => {
    const { result } = renderHook(() => usePendingGeneration());
    expect(result.current.hasPendingResult).toBe(false);
  });

  it("localStorage에 항목이 있으면 마운트 시 hasPendingResult가 true다", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId: "s-1", timestamp: Date.now() - 10000 }),
    );
    const { result } = renderHook(() => usePendingGeneration());
    expect(result.current.hasPendingResult).toBe(true);
  });

  it("markPending 후 localStorage에 sessionId가 저장된다", () => {
    const { result } = renderHook(() => usePendingGeneration());
    act(() => result.current.markPending("session-xyz"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.sessionId).toBe("session-xyz");
  });

  it("clearPending은 localStorage를 제거하고 hasPendingResult를 false로 만든다", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId: "s-1", timestamp: Date.now() - 10000 }),
    );
    const { result } = renderHook(() => usePendingGeneration());
    expect(result.current.hasPendingResult).toBe(true);

    act(() => result.current.clearPending());

    expect(result.current.hasPendingResult).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
