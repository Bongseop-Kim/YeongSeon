import type { Product } from "@yeongseon/shared/types/view/product";
import type { ProductDTO } from "@yeongseon/shared/types/dto/product";
import { toProductView } from "@yeongseon/shared/mappers/shared-mapper";
import { enrichProductForStore } from "@/shared/lib/product/enrich-product-for-store";

export const toProduct = (record: ProductDTO): Product =>
  enrichProductForStore(toProductView(record));

export const toProducts = (records: ProductDTO[]): Product[] =>
  records.map(toProduct);
