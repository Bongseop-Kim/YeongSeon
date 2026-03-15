import { describe, expect, it } from "vitest";
import {
  fromPeriodStatsRpcRow,
  fromTodayStatsRpcRow,
  toDashboardRecentOrder,
  toDashboardStats,
} from "@/features/dashboard/api/dashboard-mapper";

describe("fromTodayStatsRpcRow", () => {
  it("비객체 입력이면 기본값을 반환한다", () => {
    expect(fromTodayStatsRpcRow(null)).toEqual({
      todayOrderCount: 0,
      todayRevenue: 0,
    });
  });

  it("문자열 숫자를 number로 변환한다", () => {
    expect(
      fromTodayStatsRpcRow({
        today_order_count: "12",
        today_revenue: "34000",
      }),
    ).toEqual({
      todayOrderCount: 12,
      todayRevenue: 34000,
    });
  });
});

describe("fromPeriodStatsRpcRow", () => {
  it("비객체 입력이면 기본값을 반환한다", () => {
    expect(fromPeriodStatsRpcRow(undefined)).toEqual({
      orderCount: 0,
      revenue: 0,
    });
  });

  it("유효하지 않은 숫자는 0으로 fallback한다", () => {
    expect(
      fromPeriodStatsRpcRow({
        period_order_count: "NaN",
        period_revenue: Number.POSITIVE_INFINITY,
      }),
    ).toEqual({
      orderCount: 0,
      revenue: 0,
    });
  });
});

describe("toDashboardStats", () => {
  it("기간 통계와 대기 건수를 대시보드 모델로 매핑한다", () => {
    expect(
      toDashboardStats(
        {
          orderCount: 14,
          revenue: 480000,
        },
        3,
        5,
      ),
    ).toEqual({
      orderCount: 14,
      revenue: 480000,
      pendingClaimCount: 3,
      pendingInquiryCount: 5,
    });
  });
});

describe("toDashboardRecentOrder", () => {
  it("최근 주문 정보를 그대로 매핑한다", () => {
    expect(
      toDashboardRecentOrder({
        id: "order-1",
        orderNumber: "ORD-001",
        date: "2026-03-15",
        customerName: "홍길동",
        orderType: "custom",
        status: "진행중",
        totalPrice: 23000,
      }),
    ).toEqual({
      id: "order-1",
      orderNumber: "ORD-001",
      date: "2026-03-15",
      customerName: "홍길동",
      orderType: "custom",
      status: "진행중",
      totalPrice: 23000,
    });
  });

  it("totalPrice가 nullish면 null로 정규화한다", () => {
    expect(
      toDashboardRecentOrder({
        id: "order-2",
        orderNumber: "ORD-002",
        date: "2026-03-16",
        customerName: "김영희",
        orderType: "sale",
        status: "배송완료",
        totalPrice: null,
      }),
    ).toEqual(
      expect.objectContaining({
        id: "order-2",
        totalPrice: null,
      }),
    );
  });
});
