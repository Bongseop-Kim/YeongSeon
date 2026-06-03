import { supabase } from "@/lib/supabase";
import {
  fromAdminProductOption,
  toAdminProductDetail,
  toAdminProductListItem,
  toProductPayload,
  type ProductOptionRow,
  type ProductRecord,
  type ProductsTableRow,
} from "./products-mapper";
import type {
  AdminProductDetail,
  AdminProductFormValues,
  AdminProductListItem,
  AdminProductOption,
} from "@/features/products/types/admin-product";

interface AdminProductListResult {
  rows: AdminProductListItem[];
  total: number;
}

export async function getAdminProducts(params: {
  page: number;
  pageSize: number;
  category?: string | null;
}): Promise<AdminProductListResult> {
  const normalizedPage = Math.max(1, Math.floor(params.page || 1));
  const from = (normalizedPage - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from("admin_product_list_view")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.category) {
    query = query.eq("category", params.category);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as ProductsTableRow[]).map(toAdminProductListItem),
    total: count ?? 0,
  };
}

export async function getAdminProductDetail(
  productId: number,
): Promise<AdminProductDetail> {
  const [productResult, optionsResult] = await Promise.all([
    supabase.from("products").select("*").eq("id", productId).single(),
    supabase
      .from("product_options")
      .select("name, additional_price, stock, product_id")
      .eq("product_id", productId),
  ]);
  const { data: product, error: productError } = productResult;
  const { data: options, error: optionsError } = optionsResult;

  if (productError) throw new Error(productError.message);
  if (optionsError) throw new Error(optionsError.message);

  return toAdminProductDetail(
    product as ProductRecord,
    (options ?? []) as ProductOptionRow[],
  );
}

/**
 * products/product_options 테이블 직접 쓰기
 *
 * 직접 쓰기 근거:
 * - RLS USING/WITH CHECK: public.is_admin() → 관리자만 생성·수정 가능하다.
 * - 상품 관리는 관리자 전용 리소스이며 기존 refine dataProvider 직접 쓰기 계약을 API 계층으로 이동한다.
 * - product_options 교체는 SECURITY INVOKER RPC replace_product_options로 기존 원자성 계약을 유지한다.
 */
export async function createProduct(params: {
  values: AdminProductFormValues;
  imageUrls: string[];
}): Promise<number> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      ...toProductPayload(params.values, params.imageUrls),
      code: null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  const productId = (data as { id: number }).id;

  if (params.values.options.length > 0) {
    await insertProductOptions({ productId, options: params.values.options });
  }

  return productId;
}

export async function updateProduct(params: {
  productId: number;
  values: AdminProductFormValues;
  imageUrls: string[];
}): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update(toProductPayload(params.values, params.imageUrls))
    .eq("id", params.productId);

  if (error) throw new Error(error.message);
  await saveProductOptions({
    productId: params.productId,
    options: params.values.options,
  });
}

async function insertProductOptions({
  productId,
  options,
}: {
  productId: number;
  options: AdminProductOption[];
}): Promise<void> {
  if (options.length === 0) return;

  const { error } = await supabase
    .from("product_options")
    .insert(options.map((option) => fromAdminProductOption(option, productId)));

  if (error) {
    throw new Error(error.message);
  }
}

async function saveProductOptions({
  productId,
  options,
}: {
  productId: number;
  options: AdminProductOption[];
}): Promise<void> {
  const { error } = await supabase.rpc("replace_product_options", {
    p_product_id: productId,
    p_options: options.map((option) =>
      fromAdminProductOption(option, productId),
    ),
  });

  if (error) {
    throw new Error(error.message);
  }
}
