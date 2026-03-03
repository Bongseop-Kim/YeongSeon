import { useList } from "@refinedev/core";
import type { AdminOrderListRowDTO } from "@yeongseon/shared";
import { toDashboardRecentOrder, toDashboardStats } from "./dashboard-mapper";
import type {
  AdminDashboardRecentOrder,
  AdminDashboardStats,
  SegmentValue,
} from "../types/admin-dashboard";

export function useDashboardStats(segment: SegmentValue): AdminDashboardStats {
  const today = new Date().toISOString().slice(0, 10);

  const orderTypeFilter =
    segment !== "all"
      ? [{ field: "orderType" as const, operator: "eq" as const, value: segment }]
      : [];

  const { result: todayOrdersResult } = useList<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    filters: [{ field: "date", operator: "eq", value: today }, ...orderTypeFilter],
    pagination: { pageSize: 1000 },
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
    todayOrdersResult.data ?? [],
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
