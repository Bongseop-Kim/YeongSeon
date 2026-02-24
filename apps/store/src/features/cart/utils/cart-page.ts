import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { Product } from "@yeongseon/shared/types/view/product";

export const getSelectedCartItems = (
  items: CartItem[],
  selectedItemIds: string[],
) => items.filter((item) => selectedItemIds.includes(item.id));

export const getRecommendedProducts = (
  items: CartItem[],
  catalog: Product[],
  limit: number,
) => {
  if (items.length === 0) {
    return [];
  }

  const productItems = items.filter((item) => item.type === "product");
  if (productItems.length === 0) {
    return [];
  }

  const cartProductIds = new Set(productItems.map((item) => item.product.id));
  const cartProperties = productItems.map((item) => ({
    category: item.product.category,
    color: item.product.color,
    pattern: item.product.pattern,
    material: item.product.material,
  }));

  return catalog
    .filter((product) => {
      if (cartProductIds.has(product.id)) {
        return false;
      }

      return cartProperties.some(
        (props) =>
          product.category === props.category ||
          product.color === props.color ||
          product.pattern === props.pattern ||
          product.material === props.material,
      );
    })
    .slice(0, limit);
};
