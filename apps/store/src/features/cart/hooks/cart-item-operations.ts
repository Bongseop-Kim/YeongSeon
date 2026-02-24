import type { CartItem, ReformCartItem } from "@yeongseon/shared/types/view/cart";
import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";
import type { TieItem } from "@yeongseon/shared/types/view/reform";
import type { Product, ProductOption } from "@yeongseon/shared/types/view/product";

type GenerateItemId = (productId: string | number, optionId?: string) => string;

export interface AddProductToCartResult {
  nextItems: CartItem[];
  wasExistingItem: boolean;
}

export const addProductToCart = (
  currentItems: CartItem[],
  product: Product,
  option: ProductOption | undefined,
  quantity: number,
  generateItemId: GenerateItemId,
): AddProductToCartResult => {
  const existingItemIndex = currentItems.findIndex(
    (item) =>
      item.type === "product" &&
      item.product.id === product.id &&
      item.selectedOption?.id === option?.id,
  );

  if (existingItemIndex !== -1) {
    const existingItem = currentItems[existingItemIndex];
    return {
      wasExistingItem: true,
      nextItems: currentItems.map((item, index) =>
        index === existingItemIndex
          ? { ...existingItem, quantity: existingItem.quantity + quantity }
          : item,
      ),
    };
  }

  const newItem: CartItem = {
    id: generateItemId(product.id, option?.id || "base"),
    type: "product",
    product,
    selectedOption: option,
    quantity,
  };

  return {
    wasExistingItem: false,
    nextItems: [...currentItems, newItem],
  };
};

export const addReformToCart = (
  currentItems: CartItem[],
  reformData: { tie: TieItem; cost: number },
  generateItemId: GenerateItemId,
): CartItem[] => {
  const newItem: ReformCartItem = {
    id: generateItemId("reform"),
    type: "reform",
    quantity: 1,
    reformData,
  };

  return [...currentItems, newItem];
};

export const removeCartItem = (currentItems: CartItem[], itemId: string) =>
  currentItems.filter((item) => item.id !== itemId);

export const updateCartItemQuantity = (
  currentItems: CartItem[],
  itemId: string,
  quantity: number,
) => {
  if (quantity < 1) {
    return currentItems;
  }

  return currentItems.map((item) =>
    item.id === itemId ? { ...item, quantity } : item,
  );
};

export const updateReformCartItemOption = (
  currentItems: CartItem[],
  itemId: string,
  tie: TieItem,
) =>
  currentItems.map((item) =>
    item.id === itemId && item.type === "reform"
      ? { ...item, reformData: { ...item.reformData, tie } }
      : item,
  );

export const applyCartItemCoupon = (
  currentItems: CartItem[],
  itemId: string,
  coupon: AppliedCoupon | undefined,
) =>
  currentItems.map((item) =>
    item.id === itemId
      ? {
          ...item,
          appliedCoupon: coupon,
          appliedCouponId: coupon?.id,
        }
      : item,
  );

export const updateProductCartItemOption = (
  currentItems: CartItem[],
  itemId: string,
  newOption: ProductOption | undefined,
  newQuantity: number,
  generateItemId: GenerateItemId,
) => {
  const item = currentItems.find((currentItem) => currentItem.id === itemId);
  if (!item || item.type !== "product") {
    return currentItems;
  }

  const itemsWithoutOld = currentItems.filter((currentItem) => currentItem.id !== itemId);
  const existingItemIndex = itemsWithoutOld.findIndex(
    (currentItem) =>
      currentItem.type === "product" &&
      currentItem.product.id === item.product.id &&
      currentItem.selectedOption?.id === newOption?.id,
  );

  if (existingItemIndex !== -1) {
    return itemsWithoutOld.map((currentItem, index) =>
      index === existingItemIndex
        ? { ...currentItem, quantity: currentItem.quantity + newQuantity }
        : currentItem,
    );
  }

  const newItem: CartItem = {
    id: generateItemId(item.product.id, newOption?.id || "base"),
    type: "product",
    product: item.product,
    selectedOption: newOption,
    quantity: newQuantity,
  };

  return [...itemsWithoutOld, newItem];
};
