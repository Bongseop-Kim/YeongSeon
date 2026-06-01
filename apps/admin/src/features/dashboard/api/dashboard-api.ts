import type { AdminOrderListRowDTO } from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";
import {
  fromPeriodStatsRpcRow,
  toDashboardRecentOrder,
} from "@/features/dashboard/api/dashboard-mapper";
import type {
  AdminDashboardRecentOrder,
  PeriodStatsDTO,
  SegmentValue,
} from "@/features/dashboard/types/admin-dashboard";

export async function getPeriodStats(
  segment: SegmentValue,
  startDate: string,
  endDate: string,
): Promise<PeriodStatsDTO> {
  const { data, error } = await supabase.rpc("admin_get_period_stats", {
    p_order_type: segment,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : null;
  return fromPeriodStatsRpcRow(row);
}

export async function getPendingClaimCount(): Promise<number> {
  const { error, count } = await supabase
    .from("admin_claim_list_view")
    .select("id", { count: "exact", head: true })
    .in("status", ["접수", "처리중"]);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getPendingInquiryCount(): Promise<number> {
  const { error, count } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "답변대기");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getDashboardRecentOrders(params: {
  segment: SegmentValue;
  startDate: string;
  endDate: string;
}): Promise<AdminDashboardRecentOrder[]> {
  let query = supabase
    .from("admin_order_list_view")
    .select("*")
    .gte("date", params.startDate)
    .lte("date", params.endDate)
    .order("createdAt", { ascending: false })
    .limit(5);

  if (params.segment !== "all") {
    query = query.eq("orderType", params.segment);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as AdminOrderListRowDTO[]).map(toDashboardRecentOrder);
}
