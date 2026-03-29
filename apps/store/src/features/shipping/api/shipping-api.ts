import { supabase } from "@/shared/lib/supabase";
import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import { toShippingAddressView } from "@/features/shipping/api/shipping-mapper";

const TABLE_NAME = "shipping_addresses";

/**
 * 현재 사용자의 모든 배송지 조회
 */
export const getShippingAddresses = async (): Promise<ShippingAddress[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`배송지 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(toShippingAddressView);
};

/**
 * 배송지 삭제
 *
 * 직접 테이블 쓰기 예외: shipping_addresses DELETE
 * 근거: supabase/schemas/11_shipping_addresses.sql RLS 정책
 *   "user_id = auth.uid()" 로 소유권이 보장되며, 단일 원자 연산이므로 직접 삭제 허용.
 */
export const deleteShippingAddress = async (id: string): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`배송지 삭제 실패: ${error.message}`);
  }
};
