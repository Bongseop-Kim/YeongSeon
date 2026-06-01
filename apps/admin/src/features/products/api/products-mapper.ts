import type {
  AdminProductDetail,
  AdminProductFormOption,
  AdminProductFormValues,
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

export interface ProductRecord {
  id: number;
  code: string | null;
  name: string;
  category: string;
  color: string;
  pattern: string;
  material: string;
  info: string;
  price: number;
  stock: number | null;
  image: string | null;
  detail_images: string[] | null;
  option_label: string | null;
}

export interface ProductOptionRow {
  name: string | null;
  additional_price: number | null;
  stock: number | null;
  product_id: number;
}

export interface ProductPayload {
  code: string | null;
  name: string;
  category: string;
  color: string;
  pattern: string;
  material: string;
  info: string;
  price: number;
  stock: number | null;
  option_label: string | null;
  image: string | null;
  detail_images: string[];
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

export function toAdminProductDetail(
  product: ProductRecord,
  options: ProductOptionRow[],
): AdminProductDetail {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    category: product.category,
    color: product.color,
    pattern: product.pattern,
    material: product.material,
    info: product.info,
    price: product.price,
    stock: product.stock,
    image: product.image,
    detailImages: product.detail_images ?? [],
    optionLabel: product.option_label,
    options: options.map(toAdminProductOption),
  };
}

export function toAdminProductFormValues(
  product: AdminProductDetail,
): AdminProductFormValues {
  return {
    code: product.code,
    name: product.name,
    category: product.category,
    color: product.color,
    pattern: product.pattern,
    material: product.material,
    info: product.info,
    price: product.price,
    stock: product.stock,
    optionLabel: product.optionLabel ?? "",
    options: product.options.map(
      (option, index): AdminProductFormOption => ({
        ...option,
        formKey: `existing-${product.id}-${index}`,
      }),
    ),
  };
}

export function toProductPayload(
  values: AdminProductFormValues,
  imageUrls: string[],
): ProductPayload {
  const hasOptions = values.options.length > 0;

  return {
    code: values.code || null,
    name: values.name,
    category: values.category,
    color: values.color,
    pattern: values.pattern,
    material: values.material,
    info: values.info,
    price: values.price ?? 0,
    stock: hasOptions ? null : values.stock,
    option_label: hasOptions ? values.optionLabel || null : null,
    image: imageUrls[0] ?? null,
    detail_images: imageUrls,
  };
}
