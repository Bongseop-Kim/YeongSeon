import type { Product } from "@yeongseon/shared/types/view/product";
import type { ProductDTO } from "@yeongseon/shared/types/dto/product";
import { toProductView } from "@yeongseon/shared/mappers/shared-mapper";
import {
  getCategoryLabel,
  getMaterialLabel,
} from "@/features/shop/constants/PRODUCT_LABELS";

export const toProduct = (record: ProductDTO): Product => {
  const product = toProductView(record);

  return {
    ...product,
    categoryLabel: getCategoryLabel(product.category),
    materialLabel: getMaterialLabel(product.material),
  };
};

export const toProducts = (records: ProductDTO[]): Product[] =>
  records.map(toProduct);
