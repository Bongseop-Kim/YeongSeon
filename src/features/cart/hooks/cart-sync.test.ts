import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CartItem } from "@/features/cart/types/view/cart";
import { syncCartItemsWithRollback } from "@/features/cart/hooks/cart-sync";

describe("cart-sync rollback", () => {
  it("guest 저장 실패 시 이전 상태로 롤백한다", async () => {
    const previousItems: CartItem[] = [
      {
        id: "item-1",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: { id: "tie-1", measurementType: "length", tieLength: 145 },
          cost: 15000,
        },
      },
    ];

    const nextItems: CartItem[] = [
      ...previousItems,
      {
        id: "item-2",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: { id: "tie-2", measurementType: "height", wearerHeight: 170 },
          cost: 15000,
        },
      },
    ];

    const cacheWrites: CartItem[][] = [];
    const guestWrites: CartItem[][] = [];
    const errors: string[] = [];

    const queryClient = {
      setQueryData: (_key: readonly unknown[], value: CartItem[]) => {
        cacheWrites.push(value);
      },
    };

    await assert.rejects(async () => {
      await syncCartItemsWithRollback({
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
      });
    });

    assert.equal(errors.length, 1);
    assert.equal(errors[0], "장바구니 업데이트 실패");
    assert.equal(cacheWrites.at(-1), previousItems);
    assert.equal(guestWrites.at(-1), previousItems);
  });
});
