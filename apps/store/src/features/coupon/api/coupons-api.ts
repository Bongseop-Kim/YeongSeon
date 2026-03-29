import { supabase } from "@/shared/lib/supabase";
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import type { UserCoupon } from "@yeongseon/shared/types/view/coupon";
import {
  mapRecordToUserCoupon,
  parseUserCouponRecords,
} from "@/features/coupon/api/coupons-mapper";

const COUPON_COLUMNS =
  "id, name, discount_type, discount_value, max_discount_amount, description, expiry_date, additional_info";

const USER_COUPON_COLUMNS = `id, user_id, coupon_id, status, issued_at, expires_at, used_at, coupon:coupons(${COUPON_COLUMNS})`;

const applyActiveFilter = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PostgrestFilterBuilder 제네릭은 SDK 타입 제약상 unknown으로 대체 불가
  T extends PostgrestFilterBuilder<any, any, any, any>,
>(
  query: T,
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
      .order("issued_at", { ascending: false }),
  );

  if (error) {
    throw new Error(`쿠폰 조회에 실패했어요: ${error.message}`);
  }

  if (!data) return [];

  return parseUserCouponRecords(data).map(mapRecordToUserCoupon);
};
