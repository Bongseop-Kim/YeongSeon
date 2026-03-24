import { supabase } from "@/lib/supabase";
import { fromPeriodStatsRpcRow } from "@/features/dashboard/api/dashboard-mapper";
import type {
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
