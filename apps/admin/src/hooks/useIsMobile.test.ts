import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useIsMobile } from "@/hooks/useIsMobile";

const useBreakpointMock = vi.hoisted(() => vi.fn());

vi.mock("antd", () => ({
  Grid: {
    useBreakpoint: useBreakpointMock,
  },
}));

describe("useIsMobile", () => {
  it("lg 값이 없으면 false를 반환한다", () => {
    useBreakpointMock.mockReturnValue({});

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("lg가 true면 desktop으로 판단한다", () => {
    useBreakpointMock.mockReturnValue({ lg: true });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("lg가 false면 mobile로 판단한다", () => {
    useBreakpointMock.mockReturnValue({ lg: false });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });
});
