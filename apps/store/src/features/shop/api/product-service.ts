import type { Product } from "@/features/shop/types/view/product";
import {
  getProductById,
  getProducts,
  getProductsByIds,
} from "@/features/shop/api/products-api";

export const productService = {
  getProducts,
  getProductById,
  getProductsByIds,
};

export { getProducts, getProductById, getProductsByIds };
export type { Product };
