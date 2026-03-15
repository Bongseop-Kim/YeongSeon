import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAddToCartItems } from "@/features/cart/hooks/useAddToCartItems";
import { createProduct, createProductOption } from "@/test/fixtures";

const addToCart = vi.fn();

vi.mock("@/features/cart/hooks/useCart", () => ({
  useCart: () => ({
    addToCart,
  }),
}));

describe("useAddToCartItems", () => {
  it("옵션이 있으면 각 옵션별 추가 결과를 집계한다", async () => {
    addToCart
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("fail"));

    const { result } = renderHook(() => useAddToCartItems());

    await expect(
      result.current.addItemsToCart(createProduct(), {
        hasOptions: true,
        baseQuantity: 1,
        selectedOptions: [
          { option: createProductOption({ id: "opt-1" }), quantity: 1 },
          { option: createProductOption({ id: "opt-2" }), quantity: 2 },
        ],
      }),
    ).resolves.toEqual({
      succeeded: 1,
      failed: 1,
      total: 2,
    });
  });

  it("옵션이 없으면 기본 수량 1건만 추가한다", async () => {
    addToCart.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAddToCartItems());

    await expect(
      result.current.addItemsToCart(createProduct(), {
        hasOptions: false,
        baseQuantity: 3,
        selectedOptions: [],
      }),
    ).resolves.toEqual({
      succeeded: 1,
      failed: 0,
      total: 1,
    });
  });
});
