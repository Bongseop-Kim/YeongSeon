import { supabase } from "@/lib/supabase";
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import type { UserCoupon } from "../types/coupon";
import type { UserCouponRecord } from "../types/coupon-record";
import { mapRecordToUserCoupon } from "../utils/map-record-to-user-coupon";

const COUPON_COLUMNS =
  "id, name, discount_type, discount_value, max_discount_amount, description, expiry_date, additional_info";

const USER_COUPON_COLUMNS = `id, user_id, coupon_id, status, issued_at, expires_at, used_at, coupon:coupons(${COUPON_COLUMNS})`;

const applyActiveFilter = <
  T extends PostgrestFilterBuilder<any, any, any, any>
>(
  query: T
): T => {
  const nowIso = new Date().toISOString();
  return query
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
};

export const getUserCoupons = async (): Promise<UserCoupon[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await applyActiveFilter(
    supabase
      .from("user_coupons")
      .select(USER_COUPON_COLUMNS)
      .eq("user_id", user.id)
      .eq("coupon.is_active", true)
      .gte("coupon.expiry_date", today)
      .order("issued_at", { ascending: false })
  );

  if (error) {
    throw new Error(`쿠폰 조회에 실패했어요: ${error.message}`);
  }

  if (!data) return [];

  return (data as unknown as UserCouponRecord[]).map(mapRecordToUserCoupon);
};

export const getUserCouponsByIds = async (
  ids: string[],
  options?: { activeOnly?: boolean }
): Promise<UserCoupon[]> => {
  if (ids.length === 0) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("user_coupons")
    .select(USER_COUPON_COLUMNS)
    .eq("user_id", user.id)
    .in("id", ids);

  if (options?.activeOnly) {
    query = applyActiveFilter(query)
      .eq("coupon.is_active", true)
      .gte("coupon.expiry_date", today);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`쿠폰 정보를 불러올 수 없습니다: ${error.message}`);
  }

  if (!data) return [];

  return (data as unknown as UserCouponRecord[]).map(mapRecordToUserCoupon);
};

export const getUserCouponsByIdsMap = async (
  ids: string[],
  options?: { activeOnly?: boolean }
): Promise<Map<string, UserCoupon>> => {
  if (ids.length === 0) {
    return new Map();
  }

  const coupons = await getUserCouponsByIds(ids, options);
  return new Map(coupons.map((coupon) => [coupon.id, coupon]));
};
