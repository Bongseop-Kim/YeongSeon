import { useQuery } from "@tanstack/react-query";
import { useList } from "@refinedev/core";
import type { AdminOrderListRowDTO } from "@yeongseon/shared";
import { getTodayStats } from "./dashboard-api";
import { toDashboardRecentOrder, toDashboardStats } from "./dashboard-mapper";
import type {
  AdminDashboardRecentOrder,
  AdminDashboardStats,
  SegmentValue,
} from "../types/admin-dashboard";

export function useDashboardStats(segment: SegmentValue): AdminDashboardStats {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const { data: todayStats } = useQuery({
    queryKey: ["dashboard", "today-stats", segment, today],
    queryFn: () => getTodayStats(segment, today),
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
    todayStats ?? { todayOrderCount: 0, todayRevenue: 0 },
    pendingClaimsResult.total ?? 0,
    pendingInquiriesResult.total ?? 0
  );
}

export function useDashboardRecentOrders(
  segment: SegmentValue
): AdminDashboardRecentOrder[] {
  const orderTypeFilter =
    segment !== "all"
      ? [{ field: "orderType" as const, operator: "eq" as const, value: segment }]
      : [];

  const { result: recentOrdersResult } = useList<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    sorters: [{ field: "created_at", order: "desc" }],
    filters: orderTypeFilter,
    pagination: { pageSize: 5 },
  });

  return (recentOrdersResult.data ?? []).map(toDashboardRecentOrder);
}
