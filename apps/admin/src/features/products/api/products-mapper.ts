import type {
  AdminProductListItem,
  AdminProductOption,
} from "@/features/products/types/admin-product";

export interface ProductsTableRow {
  id: number;
  image: string | null;
  code: string | null;
  name: string;
  category: string;
  color: string;
  material: string;
  price: number;
  stock: number | null;
  option_stock_total: number | null;
  option_count: number;
}

interface ProductOptionRow {
  name: string | null;
  additional_price: number | null;
  stock: number | null;
  product_id: number;
}

export function toAdminProductListItem(
  row: ProductsTableRow,
): AdminProductListItem {
  return {
    id: row.id,
    image: row.image,
    code: row.code,
    name: row.name,
    category: row.category,
    color: row.color,
    material: row.material,
    price: row.price,
    stock: row.stock,
    optionStockTotal: row.option_stock_total,
    optionCount: row.option_count,
  };
}

export function toAdminProductOption(
  row: ProductOptionRow,
): AdminProductOption {
  return {
    name: row.name ?? "",
    additionalPrice: row.additional_price ?? 0,
    stock: row.stock,
  };
}

export function fromAdminProductOption(
  option: AdminProductOption,
  productId: number,
): ProductOptionRow {
  return {
    product_id: productId,
    name: option.name,
    additional_price: option.additionalPrice,
    stock: option.stock,
  };
}
