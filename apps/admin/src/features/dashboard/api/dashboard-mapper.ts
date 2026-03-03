import type { AdminOrderListRowDTO } from "@yeongseon/shared";
import type {
  AdminDashboardRecentOrder,
  AdminDashboardStats,
} from "../types/admin-dashboard";

export function toDashboardStats(
  todayOrders: AdminOrderListRowDTO[],
  pendingClaimTotal: number,
  pendingInquiryTotal: number
): AdminDashboardStats {
  return {
    todayOrderCount: todayOrders.length,
    todayRevenue: todayOrders.reduce(
      (sum: number, order: AdminOrderListRowDTO) => sum + (order.totalPrice ?? 0),
      0
    ),
    pendingClaimCount: pendingClaimTotal,
    pendingInquiryCount: pendingInquiryTotal,
  };
}

export function toDashboardRecentOrder(
  dto: AdminOrderListRowDTO
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
