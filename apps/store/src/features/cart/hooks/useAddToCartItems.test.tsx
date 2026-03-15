import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAddToCartItems } from "@/features/cart/hooks/useAddToCartItems";
import { createProduct, createProductOption } from "@/test/fixtures";

const addToCart = vi.fn();

vi.mock("@/features/cart/hooks/useCart", () => ({
  useCart: () => ({
    addToCart,
  }),
}));

describe("useAddToCartItems", () => {
  beforeEach(() => {
    addToCart.mockReset();
  });

  it("옵션이 있으면 각 옵션별 추가 결과를 집계한다", async () => {
    addToCart
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("fail"));
    const product = createProduct();
    const firstOption = createProductOption({ id: "opt-1" });
    const secondOption = createProductOption({ id: "opt-2" });

    const { result } = renderHook(() => useAddToCartItems());

    await expect(
      result.current.addItemsToCart(product, {
        hasOptions: true,
        baseQuantity: 1,
        selectedOptions: [
          { option: firstOption, quantity: 1 },
          { option: secondOption, quantity: 2 },
        ],
      }),
    ).resolves.toEqual({
      succeeded: 1,
      failed: 1,
      total: 2,
    });
    expect(addToCart).toHaveBeenCalledTimes(2);
    expect(addToCart).toHaveBeenNthCalledWith(1, product, {
      option: firstOption,
      quantity: 1,
      showModal: false,
    });
    expect(addToCart).toHaveBeenNthCalledWith(2, product, {
      option: secondOption,
      quantity: 2,
      showModal: false,
    });
  });

  it("옵션이 없으면 기본 수량 1건만 추가한다", async () => {
    addToCart.mockResolvedValueOnce(undefined);
    const product = createProduct();

    const { result } = renderHook(() => useAddToCartItems());

    await expect(
      result.current.addItemsToCart(product, {
        hasOptions: false,
        baseQuantity: 3,
        selectedOptions: [],
      }),
    ).resolves.toEqual({
      succeeded: 1,
      failed: 0,
      total: 1,
    });
    expect(addToCart).toHaveBeenCalledTimes(1);
    expect(addToCart).toHaveBeenCalledWith(product, {
      quantity: 3,
      showModal: false,
    });
  });
});
