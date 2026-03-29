import type { Product } from "@yeongseon/shared/types/view/product";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { SelectedOption } from "@/features/shop/detail/types/selected-option";
import { ROUTES } from "@/shared/constants/ROUTES";
import { generateItemId } from "@/shared/lib/utils";
import { toast } from "@/shared/lib/toast";

export function processOrderAndNavigate(
  product: Product,
  selectedOptions: SelectedOption[],
  baseQuantity: number,
  setOrderItems: (items: CartItem[]) => void,
  navigate: (path: string) => void,
): void {
  const hasOptions = (product.options ?? []).length > 0;
  if (hasOptions) {
    if (selectedOptions.length === 0) {
      toast.warning("옵션을 선택해주세요.");
      return;
    }

    const orderItems: CartItem[] = selectedOptions.map((selectedOption) => ({
      id: generateItemId(product.id, selectedOption.option.id),
      type: "product",
      product,
      selectedOption: selectedOption.option,
      quantity: selectedOption.quantity,
    }));

    setOrderItems(orderItems);
  } else {
    const orderItems: CartItem[] = [
      {
        id: generateItemId(product.id, "base"),
        type: "product",
        product,
        selectedOption: undefined,
        quantity: baseQuantity,
      },
    ];

    setOrderItems(orderItems);
  }

  navigate(ROUTES.ORDER_FORM);
}
