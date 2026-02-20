import { describe, it, expect } from "vitest";
import type { CartItem } from "@/features/cart/types/view/cart";
import { createReformCartItem } from "@/test/fixtures";
import { syncCartItemsWithRollback } from "@/features/cart/hooks/cart-sync";

describe("cart-sync rollback", () => {
  it("guest 저장 실패 시 이전 상태로 롤백한다", async () => {
    const previousItems: CartItem[] = [createReformCartItem()];

    const nextItems: CartItem[] = [
      ...previousItems,
      createReformCartItem({
        id: "item-2",
        reformData: {
          tie: { id: "tie-2", measurementType: "height", wearerHeight: 170 },
          cost: 15000,
        },
      }),
    ];

    const cacheWrites: CartItem[][] = [];
    const guestWrites: CartItem[][] = [];
    const errors: string[] = [];

    const queryClient = {
      setQueryData: (_key: readonly unknown[], value: CartItem[]) => {
        cacheWrites.push(value);
      },
    };

    await expect(
      syncCartItemsWithRollback({
        isLoggedIn: false,
        userId: undefined,
        queryClient,
        nextItems,
        previousItems,
        setGuestItems: async (items) => {
          guestWrites.push(items);
          if (items === nextItems) {
            throw new Error("write failed");
          }
        },
        setCartItems: async () => {},
        onError: (message) => errors.push(message),
        errorMessage: "장바구니 업데이트 실패",
      }),
    ).rejects.toThrow();

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe("장바구니 업데이트 실패");
    expect(cacheWrites.at(-1)).toBe(previousItems);
    expect(guestWrites.at(-1)).toBe(previousItems);
  });
});
