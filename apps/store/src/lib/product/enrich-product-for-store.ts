import type { Product } from "@yeongseon/shared/types/view/product";
import {
  getCategoryLabel,
  getMaterialLabel,
} from "@/features/shop/constants/PRODUCT_LABELS";

export const enrichProductForStore = (product: Product): Product => {
  return {
    ...product,
    categoryLabel: getCategoryLabel(product.category),
    materialLabel: getMaterialLabel(product.material),
  };
};
