import { beforeEach, describe, expect, it, vi } from "vitest";
import dayjs from "dayjs";
import { useDashboardRecentOrders } from "@/features/dashboard/api/dashboard-query";

const { getDashboardRecentOrdersMock, useQueryMock } = vi.hoisted(() => ({
  getDashboardRecentOrdersMock: vi.fn(),
  useQueryMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
}));

vi.mock("@/features/dashboard/api/dashboard-api", () => ({
  getDashboardRecentOrders: getDashboardRecentOrdersMock,
  getPendingClaimCount: vi.fn(),
  getPendingInquiryCount: vi.fn(),
  getPeriodStats: vi.fn(),
}));

vi.mock("@/features/dashboard/api/dashboard-mapper", () => ({
  toDashboardStats: vi.fn((...args) => args),
}));

describe("dashboard query contract", () => {
  beforeEach(() => {
    getDashboardRecentOrdersMock.mockReset();
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({ data: undefined });
  });

  it("대시보드 최근 주문 조회는 기간과 유형을 TanStack Query에 전달한다", () => {
    useDashboardRecentOrders("all", [dayjs("2026-04-01"), dayjs("2026-04-30")]);

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          "dashboard",
          "recent-orders",
          "all",
          "2026-04-01",
          "2026-04-30",
        ],
      }),
    );
  });
});
