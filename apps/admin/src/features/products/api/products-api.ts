import { supabase } from "@/lib/supabase";
import { fromAdminProductOption } from "./products-mapper";
import type { AdminProductOption } from "@/features/products/types/admin-product";

/**
 * product_options 테이블 직접 쓰기
 *
 * 직접 쓰기 근거:
 * - RLS USING: public.is_admin() → 관리자만 접근 가능
 * - product_options는 products에 종속되며 관리자 전용 리소스
 */
export async function insertProductOptions({
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

export async function saveProductOptions({
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
