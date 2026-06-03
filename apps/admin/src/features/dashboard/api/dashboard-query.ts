import { useQuery } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import {
  getDashboardRecentOrders,
  getPendingClaimCount,
  getPendingInquiryCount,
  getPeriodStats,
} from "@/features/dashboard/api/dashboard-api";
import { toDashboardStats } from "@/features/dashboard/api/dashboard-mapper";
import type {
  AdminDashboardRecentOrder,
  AdminDashboardStats,
  SegmentValue,
} from "@/features/dashboard/types/admin-dashboard";

type DashboardDateRange = [string | Dayjs, string | Dayjs];

function toDateString(value: string | Dayjs): string {
  return typeof value === "string" ? value : value.format("YYYY-MM-DD");
}

export function useDashboardStats(
  segment: SegmentValue,
  dateRange: DashboardDateRange,
): AdminDashboardStats {
  const startDate = toDateString(dateRange[0]);
  const endDate = toDateString(dateRange[1]);

  const { data: periodStats } = useQuery({
    queryKey: ["dashboard", "period-stats", segment, startDate, endDate],
    queryFn: () => getPeriodStats(segment, startDate, endDate),
  });

  const { data: pendingClaimTotal } = useQuery({
    queryKey: ["dashboard", "pending-claims"],
    queryFn: getPendingClaimCount,
  });

  const { data: pendingInquiryTotal } = useQuery({
    queryKey: ["dashboard", "pending-inquiries"],
    queryFn: getPendingInquiryCount,
  });

  return toDashboardStats(
    periodStats ?? { orderCount: 0, revenue: 0 },
    pendingClaimTotal ?? 0,
    pendingInquiryTotal ?? 0,
  );
}

export function useDashboardRecentOrders(
  segment: SegmentValue,
  dateRange: DashboardDateRange,
): AdminDashboardRecentOrder[] {
  const startDate = toDateString(dateRange[0]);
  const endDate = toDateString(dateRange[1]);

  const { data: recentOrders } = useQuery({
    queryKey: ["dashboard", "recent-orders", segment, startDate, endDate],
    queryFn: () => getDashboardRecentOrders({ segment, startDate, endDate }),
  });

  return recentOrders ?? [];
}
