import { supabase } from "@/lib/supabase";
import { fromTodayStatsRpcRow, fromPeriodStatsRpcRow } from "./dashboard-mapper";
import type { TodayStatsDTO, PeriodStatsDTO } from "../types/admin-dashboard";
import type { SegmentValue } from "../types/admin-dashboard";

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

export async function getPeriodStats(
  segment: SegmentValue,
  startDate: string,
  endDate: string
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
