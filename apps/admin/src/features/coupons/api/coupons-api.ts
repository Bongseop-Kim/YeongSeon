import { supabase } from "@/lib/supabase";
import { toAdminCouponUser } from "@/features/coupons/api/coupons-mapper";
import type { AdminCouponUser } from "@/features/coupons/types/admin-coupon";

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

export async function fetchIssuedUserIds(
  couponId: string,
): Promise<Set<string>> {
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
      !!row.user_id && !!row.created_at,
  );
}

// ── 쓰기 ───────────────────────────────────────────────────────

export async function bulkIssueCoupons(
  couponId: string,
  userIds: string[],
): Promise<void> {
  const { error } = await supabase.rpc("admin_bulk_issue_coupons", {
    p_coupon_id: couponId,
    p_user_ids: userIds,
  });

  if (error) {
    throw error;
  }
}

export async function revokeCouponsByIds(ids: string[]): Promise<void> {
  const { error } = await supabase.rpc("admin_revoke_coupons_by_ids", {
    p_ids: ids,
  });

  if (error) {
    throw error;
  }
}

export async function revokeCouponsByUserIds(
  couponId: string,
  userIds: string[],
): Promise<void> {
  const { error } = await supabase.rpc("admin_revoke_coupons_by_user_ids", {
    p_coupon_id: couponId,
    p_user_ids: userIds,
  });

  if (error) {
    throw error;
  }
}
