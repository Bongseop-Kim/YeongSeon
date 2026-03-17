import { useQuery } from "@tanstack/react-query";
import { useList } from "@refinedev/core";
import type { Dayjs } from "dayjs";
import type { AdminOrderListRowDTO } from "@yeongseon/shared";
import { getPeriodStats } from "./dashboard-api";
import { toDashboardRecentOrder, toDashboardStats } from "./dashboard-mapper";
import type {
  AdminDashboardRecentOrder,
  AdminDashboardStats,
  SegmentValue,
} from "@/features/dashboard/types/admin-dashboard";

export function useDashboardStats(
  segment: SegmentValue,
  dateRange: [Dayjs, Dayjs],
): AdminDashboardStats {
  const startDate = dateRange[0].format("YYYY-MM-DD");
  const endDate = dateRange[1].format("YYYY-MM-DD");

  const { data: periodStats } = useQuery({
    queryKey: ["dashboard", "period-stats", segment, startDate, endDate],
    queryFn: () => getPeriodStats(segment, startDate, endDate),
  });

  const { result: pendingClaimsResult } = useList({
    resource: "admin_claim_list_view",
    filters: [
      {
        operator: "or",
        value: [
          { field: "status", operator: "eq", value: "접수" },
          { field: "status", operator: "eq", value: "처리중" },
        ],
      },
    ],
    pagination: { pageSize: 1 },
  });

  const { result: pendingInquiriesResult } = useList({
    resource: "inquiries",
    filters: [{ field: "status", operator: "eq", value: "답변대기" }],
    pagination: { pageSize: 1 },
  });

  return toDashboardStats(
    periodStats ?? { orderCount: 0, revenue: 0 },
    pendingClaimsResult.total ?? 0,
    pendingInquiriesResult.total ?? 0,
  );
}

export function useDashboardRecentOrders(
  segment: SegmentValue,
  dateRange: [Dayjs, Dayjs],
): AdminDashboardRecentOrder[] {
  const startDate = dateRange[0].format("YYYY-MM-DD");
  const endDate = dateRange[1].format("YYYY-MM-DD");

  const orderTypeFilter =
    segment !== "all"
      ? [
          {
            field: "orderType" as const,
            operator: "eq" as const,
            value: segment,
          },
        ]
      : [];

  const { result: recentOrdersResult } = useList<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    sorters: [{ field: "created_at", order: "desc" }],
    filters: [
      ...orderTypeFilter,
      { field: "date", operator: "gte", value: startDate },
      { field: "date", operator: "lte", value: endDate },
    ],
    pagination: { pageSize: 5 },
  });

  return (recentOrdersResult.data ?? []).map(toDashboardRecentOrder);
}
