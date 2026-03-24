import type { OrderType } from "@yeongseon/shared";

export type SegmentValue = OrderType | "all";

export interface PeriodStatsDTO {
  orderCount: number;
  revenue: number;
}

export interface AdminDashboardStats {
  orderCount: number; // 선택 기간 주문 수 (기존 todayOrderCount 대체)
  revenue: number; // 선택 기간 매출 (기존 todayRevenue 대체)
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
