import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSelectedOptions } from "@/features/shop/detail/hooks/useSelectedOptions";

const { warning } = vi.hoisted(() => ({
  warning: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    warning,
  },
}));

const option = {
  id: "opt-1",
  name: "기본",
  additionalPrice: 0,
  stock: 3,
};

describe("useSelectedOptions", () => {
  beforeEach(() => {
    warning.mockReset();
  });

  it("옵션을 추가/삭제/초기화한다", () => {
    const { result } = renderHook(() => useSelectedOptions());

    act(() => {
      result.current.handleSelectOption(option);
    });
    expect(result.current.selectedOptions).toEqual([{ option, quantity: 1 }]);

    act(() => {
      result.current.handleSelectOption(option);
    });
    expect(result.current.selectedOptions).toEqual([{ option, quantity: 1 }]);

    act(() => {
      result.current.handleRemoveOption(option.id);
    });
    expect(result.current.selectedOptions).toEqual([]);

    act(() => {
      result.current.handleSelectOption(option);
      result.current.handleUpdateBaseQuantity(2);
      result.current.resetOptions();
    });
    expect(result.current.selectedOptions).toEqual([]);
    expect(result.current.baseQuantity).toBe(1);
  });

  it("옵션 수량과 기본 수량의 재고 초과를 막는다", () => {
    const { result } = renderHook(() => useSelectedOptions());

    act(() => {
      result.current.handleSelectOption(option);
    });
    act(() => {
      result.current.handleUpdateQuantity(option.id, 5);
      result.current.handleUpdateBaseQuantity(10, 2);
    });

    expect(result.current.selectedOptions[0]?.quantity).toBe(3);
    expect(result.current.baseQuantity).toBe(2);
    expect(warning).toHaveBeenCalledTimes(2);
  });
});
