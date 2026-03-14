import { useCart } from "@/features/cart/hooks/useCart";
import type { Product } from "@yeongseon/shared/types/view/product";
import type { SelectedOption } from "@/features/shop/detail/types";

interface AddToCartItemsOptions {
  selectedOptions: SelectedOption[];
  baseQuantity: number;
  hasOptions: boolean;
}

interface AddToCartItemsResult {
  succeeded: number;
  failed: number;
  total: number;
}

export function useAddToCartItems() {
  const { addToCart } = useCart();

  async function addItemsToCart(
    product: Product,
    { selectedOptions, baseQuantity, hasOptions }: AddToCartItemsOptions,
  ): Promise<AddToCartItemsResult> {
    if (hasOptions) {
      const results = await Promise.allSettled(
        selectedOptions.map((selectedOption) =>
          addToCart(product, {
            option: selectedOption.option,
            quantity: selectedOption.quantity,
            showModal: false,
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      return {
        succeeded: results.length - failed,
        failed,
        total: results.length,
      };
    }

    const [result] = await Promise.allSettled([
      addToCart(product, { quantity: baseQuantity, showModal: false }),
    ]);
    const failed = result.status === "rejected" ? 1 : 0;
    return { succeeded: 1 - failed, failed, total: 1 };
  }

  return { addItemsToCart };
}
