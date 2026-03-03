import { supabase } from "@/lib/supabase";
import { fromTodayStatsRpcRow } from "./dashboard-mapper";
import type { SegmentValue, TodayStatsDTO } from "../types/admin-dashboard";

export async function getTodayStats(
  segment: SegmentValue,
  date: string
): Promise<TodayStatsDTO> {
  const { data, error } = await supabase.rpc("admin_get_today_stats", {
    p_order_type: segment,
    p_date: date,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : null;
  return fromTodayStatsRpcRow(row);
}
