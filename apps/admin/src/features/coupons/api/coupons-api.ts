import { supabase } from "@/lib/supabase";
import { toAdminCouponUser } from "./coupons-mapper";
import type { AdminCouponUser } from "../types/admin-coupon";

// TODO: RPC 마이그레이션 — user_coupons 직접 쓰기는 CLAUDE.md 가드레일 위반이나,
// RLS(is_admin())로 관리자 접근만 허용되므로 임시 예외. 추후 RPC로 교체 필요.

// ── 읽기 ───────────────────────────────────────────────────────

export async function fetchCustomers(): Promise<AdminCouponUser[]> {
  const pageSize = 1000;
  const allData: AdminCouponUser[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, phone, birth, created_at")
      .eq("role", "customer")
      .eq("is_active", true)
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Array<{
      id: string;
      name: string | null;
      phone: string | null;
      birth: string | null;
      created_at: string | null;
    }>;

    allData.push(...rows.map(toAdminCouponUser));

    if (rows.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return allData;
}

export async function fetchPurchasedUserIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("orders")
    .select("user_id")
    .eq("status", "완료");

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.user_id).filter(Boolean));
}

export async function fetchIssuedUserIds(couponId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_coupons")
    .select("user_id")
    .eq("coupon_id", couponId);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.user_id).filter(Boolean));
}

export async function fetchCompletedOrderDates(): Promise<
  Array<{ user_id: string; created_at: string }>
> {
  const { data, error } = await supabase
    .from("orders")
    .select("user_id, created_at")
    .eq("status", "완료");

  if (error) {
    throw error;
  }

  return (data ?? []).filter(
    (row): row is { user_id: string; created_at: string } =>
      !!row.user_id && !!row.created_at
  );
}

// ── 쓰기 ───────────────────────────────────────────────────────

export async function bulkIssueCoupons(
  couponId: string,
  userIds: string[]
): Promise<void> {
  const { error } = await supabase.from("user_coupons").upsert(
    userIds.map((userId) => ({
      user_id: userId,
      coupon_id: couponId,
      status: "active",
    })),
    { onConflict: "user_id,coupon_id" }
  );

  if (error) {
    throw error;
  }
}

export async function revokeCouponsByIds(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from("user_coupons")
    .update({ status: "revoked" })
    .in("id", ids)
    .eq("status", "active");

  if (error) {
    throw error;
  }
}

export async function revokeCouponsByUserIds(
  couponId: string,
  userIds: string[]
): Promise<void> {
  const { error } = await supabase
    .from("user_coupons")
    .update({ status: "revoked" })
    .eq("coupon_id", couponId)
    .in("user_id", userIds)
    .eq("status", "active");

  if (error) {
    throw error;
  }
}
