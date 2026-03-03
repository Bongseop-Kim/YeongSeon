import type { OrderType } from "@yeongseon/shared";

export type SegmentValue = OrderType | "all";

export interface TodayStatsDTO {
  todayOrderCount: number;
  todayRevenue: number;
}

export interface AdminDashboardStats {
  todayOrderCount: number;
  todayRevenue: number;
  pendingClaimCount: number;
  pendingInquiryCount: number;
}

export interface AdminDashboardRecentOrder {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  orderType: OrderType;
  status: string;
  totalPrice: number | null;
}
