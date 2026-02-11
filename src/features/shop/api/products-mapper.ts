import type { Product } from "@/features/shop/types/view/product";
import type { ProductDTO } from "@/features/shop/types/dto/product";
import { toProductView } from "@/features/shared/api/shared-mapper";

export const toProduct = (record: ProductDTO): Product =>
  toProductView(record);

export const toProducts = (records: ProductDTO[]): Product[] =>
  records.map(toProduct);
