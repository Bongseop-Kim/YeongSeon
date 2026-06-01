import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardContent } from "@/widgets/dashboard/dashboard-content";

const { useDashboardRecentOrdersMock, useDashboardStatsMock } = vi.hoisted(
  () => ({
    useDashboardRecentOrdersMock: vi.fn(),
    useDashboardStatsMock: vi.fn(),
  }),
);

vi.mock("@/features/dashboard", () => ({
  DashboardRecentOrders: () => <div data-testid="recent-orders" />,
  DashboardStatsRow: () => <div data-testid="stats-row" />,
  useDashboardRecentOrders: useDashboardRecentOrdersMock,
  useDashboardStats: useDashboardStatsMock,
}));

vi.mock(
  "@/features/quote-requests/components/quote-request-list-table",
  () => ({
    QuoteRequestDashboardTable: () => <div data-testid="quote-request-table" />,
  }),
);

describe("DashboardContent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1, 12));
    useDashboardRecentOrdersMock.mockReturnValue([]);
    useDashboardStatsMock.mockReturnValue({
      orderCount: 0,
      pendingClaimCount: 0,
      pendingInquiryCount: 0,
      revenue: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("주문 지표 기간 프리셋을 훅 조회 기간에 반영한다", () => {
    render(<DashboardContent />);

    expect(screen.getByRole("button", { name: "최근 1주" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(useDashboardStatsMock).toHaveBeenLastCalledWith("all", [
      "2026-05-26",
      "2026-06-01",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "오늘" }));

    expect(screen.getByRole("button", { name: "오늘" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(useDashboardStatsMock).toHaveBeenLastCalledWith("all", [
      "2026-06-01",
      "2026-06-01",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "최근 1달" }));

    expect(screen.getByRole("button", { name: "최근 1달" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(useDashboardRecentOrdersMock).toHaveBeenLastCalledWith("all", [
      "2026-05-03",
      "2026-06-01",
    ]);
  });
});
