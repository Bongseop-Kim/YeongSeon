import { beforeEach, describe, expect, it, vi } from "vitest";
import dayjs from "dayjs";
import { useDashboardRecentOrders } from "@/features/dashboard/api/dashboard-query";

const { useListMock, useQueryMock, toDashboardRecentOrderMock } = vi.hoisted(
  () => ({
    useListMock: vi.fn(),
    useQueryMock: vi.fn(),
    toDashboardRecentOrderMock: vi.fn((value) => value),
  }),
);

vi.mock("@refinedev/core", () => ({
  useList: useListMock,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
}));

vi.mock("@/features/dashboard/api/dashboard-api", () => ({
  getPeriodStats: vi.fn(),
}));

vi.mock("@/features/dashboard/api/dashboard-mapper", () => ({
  toDashboardRecentOrder: toDashboardRecentOrderMock,
  toDashboardStats: vi.fn((...args) => args),
}));

describe("dashboard query contract", () => {
  beforeEach(() => {
    useListMock.mockReset();
    useQueryMock.mockReset();

    useListMock.mockReturnValue({
      result: {
        data: [],
        total: 0,
      },
    });
    useQueryMock.mockReturnValue({ data: undefined });
  });

  it("대시보드 최근 주문 조회는 createdAt으로 정렬한다", () => {
    useDashboardRecentOrders("all", [dayjs("2026-04-01"), dayjs("2026-04-30")]);

    expect(useListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: "admin_order_list_view",
        sorters: [{ field: "createdAt", order: "desc" }],
      }),
    );
  });
});
