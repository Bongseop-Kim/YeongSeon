import type { OrderType } from "@yeongseon/shared";

export type SegmentValue = OrderType | "all";

// 기존 TodayStatsDTO 는 그대로 유지 (admin_get_today_stats RPC 여전히 존재)
export interface TodayStatsDTO {
  todayOrderCount: number;
  todayRevenue: number;
}

// 새 RPC admin_get_period_stats 반환 타입
export interface PeriodStatsDTO {
  orderCount: number;
  revenue: number;
}

export interface AdminDashboardStats {
  orderCount: number;       // 선택 기간 주문 수 (기존 todayOrderCount 대체)
  revenue: number;          // 선택 기간 매출 (기존 todayRevenue 대체)
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
