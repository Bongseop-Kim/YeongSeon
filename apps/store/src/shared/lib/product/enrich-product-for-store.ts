import type { Product } from "@yeongseon/shared/types/view/product";
import {
  getCategoryLabel,
  getMaterialLabel,
} from "@/shared/lib/product/product-labels";

export const enrichProductForStore = (product: Product): Product => {
  return {
    ...product,
    categoryLabel: getCategoryLabel(product.category),
    materialLabel: getMaterialLabel(product.material),
  };
};
