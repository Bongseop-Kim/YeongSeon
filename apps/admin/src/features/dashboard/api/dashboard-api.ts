import { supabase } from "@/lib/supabase";
import type { SegmentValue } from "../types/admin-dashboard";

export interface TodayStatsDTO {
  todayOrderCount: number;
  todayRevenue: number;
}

interface TodayStatsRpcRow {
  today_order_count: unknown;
  today_revenue: unknown;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function isTodayStatsRpcRow(value: unknown): value is TodayStatsRpcRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    Object.prototype.hasOwnProperty.call(value, "today_order_count") &&
    Object.prototype.hasOwnProperty.call(value, "today_revenue")
  );
}

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

  if (!isTodayStatsRpcRow(row)) {
    return { todayOrderCount: 0, todayRevenue: 0 };
  }

  return {
    todayOrderCount: toNumber(row.today_order_count),
    todayRevenue: toNumber(row.today_revenue),
  };
}
