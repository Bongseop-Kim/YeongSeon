import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePendingGeneration } from "@/features/design/hooks/use-pending-generation";

type GenerationStatus = "idle" | "generating" | "completed" | "regenerating";

const STORAGE_KEY = "pending_design_generation";
const storage = new Map<string, string>();
const storeState = {
  generationStatus: "idle" as GenerationStatus,
};
const subscribers = new Set<
  (state: typeof storeState, previousState: typeof storeState) => void
>();

const setMockGenerationStatus = (generationStatus: GenerationStatus) => {
  const previousState = { ...storeState };
  storeState.generationStatus = generationStatus;
  subscribers.forEach((listener) => listener(storeState, previousState));
};

vi.mock("@/features/design/store/design-chat-store", () => ({
  useDesignChatStore: Object.assign(
    vi.fn((selector: (state: typeof storeState) => unknown) =>
      selector(storeState),
    ),
    {
      getState: () => storeState,
      subscribe: (
        listener: (
          state: typeof storeState,
          previousState: typeof storeState,
        ) => void,
      ) => {
        subscribers.add(listener);
        return () => {
          subscribers.delete(listener);
        };
      },
    },
  ),
}));

beforeEach(() => {
  storage.clear();
  subscribers.clear();
  setMockGenerationStatus("idle");

  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    }),
  });
});

describe("usePendingGeneration", () => {
  it("localStorage에 항목이 없으면 hasPendingResult가 false다", () => {
    const { result } = renderHook(() => usePendingGeneration());
    expect(result.current.hasPendingResult).toBe(false);
  });

  it("idle 상태에서 localStorage에 항목이 있으면 마운트 시 hasPendingResult가 true다", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId: "s-1", timestamp: Date.now() - 10000 }),
    );

    const { result } = renderHook(() => usePendingGeneration());

    expect(result.current.hasPendingResult).toBe(true);
  });

  it("생성 중에는 localStorage에 항목이 있어도 hasPendingResult가 false다", () => {
    setMockGenerationStatus("generating");
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sessionId: "s-1", timestamp: Date.now() - 10000 }),
    );

    const { result } = renderHook(() => usePendingGeneration());

    expect(result.current.hasPendingResult).toBe(false);
  });

  it("markPending은 storage만 기록하고 완료 상태 전환 시 hasPendingResult가 true가 된다", () => {
    setMockGenerationStatus("generating");

    const { result } = renderHook(() => usePendingGeneration());

    act(() => result.current.markPending("session-xyz"));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.sessionId).toBe("session-xyz");
    expect(result.current.hasPendingResult).toBe(false);

    act(() => {
      setMockGenerationStatus("completed");
    });

    expect(result.current.hasPendingResult).toBe(true);
  });

  it("localStorage 저장이 실패하면 pending 상태를 true로 만들지 않는다", () => {
    const setItemSpy = vi
      .spyOn(localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("storage unavailable");
      });

    const { result } = renderHook(() => usePendingGeneration());

    act(() => result.current.markPending("session-xyz"));

    expect(result.current.hasPendingResult).toBe(false);

    setItemSpy.mockRestore();
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
