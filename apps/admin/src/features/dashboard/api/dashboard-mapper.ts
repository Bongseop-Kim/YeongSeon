import type {
  AdminDashboardRecentOrder,
  AdminDashboardStats,
  PeriodStatsDTO,
} from "@/features/dashboard/types/admin-dashboard";

interface PeriodStatsRpcRow {
  period_order_count: unknown;
  period_revenue: unknown;
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

function isPeriodStatsRpcRow(value: unknown): value is PeriodStatsRpcRow {
  if (!value || typeof value !== "object") return false;
  return (
    Object.prototype.hasOwnProperty.call(value, "period_order_count") &&
    Object.prototype.hasOwnProperty.call(value, "period_revenue")
  );
}

export function fromPeriodStatsRpcRow(row: unknown): PeriodStatsDTO {
  if (!isPeriodStatsRpcRow(row)) {
    return { orderCount: 0, revenue: 0 };
  }
  return {
    orderCount: toNumber(row.period_order_count),
    revenue: toNumber(row.period_revenue),
  };
}

export function toDashboardStats(
  periodStats: PeriodStatsDTO,
  pendingClaimTotal: number,
  pendingInquiryTotal: number,
): AdminDashboardStats {
  return {
    orderCount: periodStats.orderCount,
    revenue: periodStats.revenue,
    pendingClaimCount: pendingClaimTotal,
    pendingInquiryCount: pendingInquiryTotal,
  };
}

export function toDashboardRecentOrder(
  dto: DashboardRecentOrderRowDTO,
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
