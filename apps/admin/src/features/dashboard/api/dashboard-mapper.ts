import type { TodayStatsDTO } from "./dashboard-api";
import type {
  AdminDashboardRecentOrder,
  AdminDashboardStats,
} from "../types/admin-dashboard";

type DashboardRecentOrderRowDTO = {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  orderType: AdminDashboardRecentOrder["orderType"];
  status: string;
  totalPrice?: number | null;
};

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
