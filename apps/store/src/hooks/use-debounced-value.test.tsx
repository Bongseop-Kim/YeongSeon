import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

describe("useDebouncedValue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("delay 이후에만 값을 갱신한다", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: "a", delay: 300 } },
    );

    rerender({ value: "b", delay: 300 });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
  });

  it("이전 타이머를 정리한다", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("a");

    rerender({ value: "c" });

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("c");
  });
});
