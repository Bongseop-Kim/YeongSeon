import { Text } from "seed-design/ui/text";
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
type DashboardDatePreset = "today" | "week" | "month";

const DATE_RANGE_PRESETS: { label: string; value: DashboardDatePreset }[] = [
  { label: "오늘", value: "today" },
  { label: "최근 1주", value: "week" },
  { label: "최근 1달", value: "month" },
];

const DATE_RANGE_PRESET_OFFSETS: Record<DashboardDatePreset, number> = {
  today: 0,
  week: 6,
  month: 29,
};

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetDateRange(
  preset: DashboardDatePreset,
  baseDate = new Date(),
): DashboardDateRange {
  const endDate = new Date(baseDate);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - DATE_RANGE_PRESET_OFFSETS[preset]);

  return [toDateInputValue(startDate), toDateInputValue(endDate)];
}

function getMatchingPreset(
  dateRange: DashboardDateRange,
): DashboardDatePreset | null {
  const baseDate = new Date();

  return (
    DATE_RANGE_PRESETS.find((preset) => {
      const presetRange = getPresetDateRange(preset.value, baseDate);
      return presetRange[0] === dateRange[0] && presetRange[1] === dateRange[1];
    })?.value ?? null
  );
}

export function DashboardContent() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("orders");
  const [segment, setSegment] = useState<SegmentValue>("all");
  const [dateRange, setDateRange] = useState<DashboardDateRange>(() =>
    getPresetDateRange("week"),
  );
  const activePreset = getMatchingPreset(dateRange);

  const stats = useDashboardStats(segment, dateRange);
  const recentOrders = useDashboardRecentOrders(segment, dateRange);

  return (
    <main className="dashboardPage">
      <div className="dashboardPageTitleGroup">
        <Text as="h1" textStyle="screenTitle" className="dashboardPageTitle">
          대시보드
        </Text>
        <Text as="p" textStyle="t4Regular" className="dashboardPageDescription">
          주문, 매출, 미처리 업무와 최근 요청을 한 곳에서 확인합니다.
        </Text>
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
                <Text
                  as="h2"
                  textStyle="t6Bold"
                  id="dashboard-period-title"
                  className="dashboardPanelTitle"
                >
                  주문 지표
                </Text>
              </div>
            </div>
            <div className="dashboardPeriodControls">
              <div className="dashboardPresetGroup" aria-label="빠른 조회 기간">
                {DATE_RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className="dashboardPresetButton"
                    aria-pressed={activePreset === preset.value}
                    onClick={() =>
                      setDateRange(getPresetDateRange(preset.value))
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="dashboardDateRange" aria-label="조회 기간">
                <label className="dashboardField">
                  <Text
                    as="span"
                    textStyle="t3Bold"
                    className="dashboardFieldLabel"
                  >
                    시작일
                  </Text>
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
                  <Text
                    as="span"
                    textStyle="t3Bold"
                    className="dashboardFieldLabel"
                  >
                    종료일
                  </Text>
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
                <Text
                  as="h2"
                  textStyle="t6Bold"
                  id="dashboard-quotes-title"
                  className="dashboardPanelTitle"
                >
                  견적 요청
                </Text>
              </div>
            </div>
            <QuoteRequestDashboardTable />
          </section>
        </section>
      ) : null}
    </main>
  );
}
