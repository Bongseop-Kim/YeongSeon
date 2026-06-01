import { useState } from "react";
import {
  useDashboardRecentOrders,
  useDashboardStats,
  DashboardRecentOrders,
  DashboardStatsRow,
} from "@/features/dashboard";
import type { SegmentValue } from "@/features/dashboard";
import { QuoteRequestDashboardTable } from "@/features/quote-requests/components/quote-request-list-table";
import "@/features/dashboard/components/dashboard.css";

type DashboardTab = "orders" | "quotes";
type DashboardDateRange = [string, string];

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDateRange(): DashboardDateRange {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6);

  return [toDateInputValue(startDate), toDateInputValue(endDate)];
}

export function DashboardContent() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("orders");
  const [segment, setSegment] = useState<SegmentValue>("all");
  const [dateRange, setDateRange] =
    useState<DashboardDateRange>(getDefaultDateRange);

  const stats = useDashboardStats(segment, dateRange);
  const recentOrders = useDashboardRecentOrders(segment, dateRange);

  return (
    <main className="dashboardPage">
      <div className="dashboardPageTitleGroup">
        <h1 className="dashboardPageTitle">대시보드</h1>
        <p className="dashboardPageDescription">
          주문, 매출, 미처리 업무와 최근 요청을 한 곳에서 확인합니다.
        </p>
      </div>

      <div className="dashboardTabList" role="tablist" aria-label="대시보드 탭">
        <button
          id="dashboard-orders-tab"
          type="button"
          className="dashboardTabButton"
          role="tab"
          aria-selected={activeTab === "orders"}
          aria-controls="dashboard-orders-panel"
          onClick={() => setActiveTab("orders")}
        >
          주문
        </button>
        <button
          id="dashboard-quotes-tab"
          type="button"
          className="dashboardTabButton"
          role="tab"
          aria-selected={activeTab === "quotes"}
          aria-controls="dashboard-quotes-panel"
          onClick={() => setActiveTab("quotes")}
        >
          견적
        </button>
      </div>

      {activeTab === "orders" ? (
        <section
          id="dashboard-orders-panel"
          role="tabpanel"
          aria-labelledby="dashboard-orders-tab"
          className="dashboardTabPanel"
        >
          <section
            className="dashboardPanel"
            aria-labelledby="dashboard-period-title"
          >
            <div className="dashboardPanelHeader">
              <div>
                <h2 id="dashboard-period-title" className="dashboardPanelTitle">
                  주문 지표
                </h2>
              </div>
            </div>
            <div className="dashboardDateRange" aria-label="조회 기간">
              <label className="dashboardField">
                <span className="dashboardFieldLabel">시작일</span>
                <input
                  className="dashboardInput"
                  type="date"
                  value={dateRange[0]}
                  max={dateRange[1]}
                  onChange={(event) =>
                    setDateRange([event.target.value, dateRange[1]])
                  }
                />
              </label>
              <label className="dashboardField">
                <span className="dashboardFieldLabel">종료일</span>
                <input
                  className="dashboardInput"
                  type="date"
                  value={dateRange[1]}
                  min={dateRange[0]}
                  onChange={(event) =>
                    setDateRange([dateRange[0], event.target.value])
                  }
                />
              </label>
            </div>
            <DashboardStatsRow stats={stats} />
          </section>

          <DashboardRecentOrders
            segment={segment}
            onSegmentChange={setSegment}
            recentOrders={recentOrders}
          />
        </section>
      ) : null}

      {activeTab === "quotes" ? (
        <section
          id="dashboard-quotes-panel"
          role="tabpanel"
          aria-labelledby="dashboard-quotes-tab"
          className="dashboardTabPanel"
        >
          <section
            className="dashboardPanel"
            aria-labelledby="dashboard-quotes-title"
          >
            <div className="dashboardPanelHeader">
              <div>
                <h2 id="dashboard-quotes-title" className="dashboardPanelTitle">
                  견적 요청
                </h2>
              </div>
            </div>
            <QuoteRequestDashboardTable />
          </section>
        </section>
      ) : null}
    </main>
  );
}
