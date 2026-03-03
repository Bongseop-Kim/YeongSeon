import { supabase } from "@/lib/supabase";
import { fromAdminProductOption } from "./products-mapper";
import type { AdminProductOption } from "../types/admin-product";

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
  const { error: deleteError } = await supabase
    .from("product_options")
    .delete()
    .eq("product_id", productId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (options.length === 0) return;

  const { error: insertError } = await supabase
    .from("product_options")
    .insert(options.map((option) => fromAdminProductOption(option, productId)));

  if (insertError) {
    throw new Error(insertError.message);
  }
}
