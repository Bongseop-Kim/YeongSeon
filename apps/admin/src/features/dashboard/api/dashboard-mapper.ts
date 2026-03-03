import type {
  AdminDashboardRecentOrder,
  AdminDashboardStats,
  TodayStatsDTO,
} from "../types/admin-dashboard";

interface TodayStatsRpcRow {
  today_order_count: unknown;
  today_revenue: unknown;
}

type DashboardRecentOrderRowDTO = {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  orderType: AdminDashboardRecentOrder["orderType"];
  status: string;
  totalPrice?: number | null;
};

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

export function fromTodayStatsRpcRow(row: unknown): TodayStatsDTO {
  if (!isTodayStatsRpcRow(row)) {
    return { todayOrderCount: 0, todayRevenue: 0 };
  }

  return {
    todayOrderCount: toNumber(row.today_order_count),
    todayRevenue: toNumber(row.today_revenue),
  };
}

export function toDashboardStats(
  todayStats: TodayStatsDTO,
  pendingClaimTotal: number,
  pendingInquiryTotal: number
): AdminDashboardStats {
  return {
    todayOrderCount: todayStats.todayOrderCount,
    todayRevenue: todayStats.todayRevenue,
    pendingClaimCount: pendingClaimTotal,
    pendingInquiryCount: pendingInquiryTotal,
  };
}

export function toDashboardRecentOrder(
  dto: DashboardRecentOrderRowDTO
): AdminDashboardRecentOrder {
  return {
    id: dto.id,
    orderNumber: dto.orderNumber,
    date: dto.date,
    customerName: dto.customerName,
    orderType: dto.orderType,
    status: dto.status,
    totalPrice: dto.totalPrice ?? null,
  };
}
