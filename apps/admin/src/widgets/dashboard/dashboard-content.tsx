import { Text } from "seed-design/ui/text";
import { useState, type ReactNode } from "react";
import {
  AdminFilterField,
  AdminFilterTextField,
} from "@/components/AdminFilterControls";
import { AdminSegmentedControl } from "@/components/AdminSegmentedControl";
import {
  useDashboardRecentOrders,
  useDashboardStats,
  DashboardRecentOrders,
  DashboardStatsRow,
  type SegmentValue,
} from "@/features/dashboard";
import { QuoteRequestDashboardTable } from "@/features/quote-requests";

type DashboardTab = "orders" | "quotes";
type DashboardDateRange = [string, string];
type DashboardDatePreset = "today" | "week" | "month";

const DATE_RANGE_PRESETS: { label: string; value: DashboardDatePreset }[] = [
  { label: "오늘", value: "today" },
  { label: "최근 1주", value: "week" },
  { label: "최근 1달", value: "month" },
];

const DASHBOARD_TABS: {
  label: string;
  panelId: string;
  tabId: string;
  value: DashboardTab;
}[] = [
  {
    label: "주문",
    panelId: "dashboard-orders-panel",
    tabId: "dashboard-orders-tab",
    value: "orders",
  },
  {
    label: "견적",
    panelId: "dashboard-quotes-panel",
    tabId: "dashboard-quotes-tab",
    value: "quotes",
  },
];

const DATE_RANGE_PRESET_OFFSETS: Record<DashboardDatePreset, number> = {
  today: 0,
  week: 6,
  month: 29,
};

interface DashboardPanelProps {
  children: ReactNode;
  title: string;
  titleId: string;
}

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

function DashboardPanel({ children, title, titleId }: DashboardPanelProps) {
  return (
    <section className="dashboardPanel" aria-labelledby={titleId}>
      <div className="dashboardPanelHeader">
        <Text
          as="h2"
          textStyle="t6Bold"
          id={titleId}
          className="dashboardPanelTitle"
        >
          {title}
        </Text>
      </div>
      {children}
    </section>
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
      <header className="dashboardPageTitleGroup">
        <Text as="h1" textStyle="screenTitle" className="dashboardPageTitle">
          대시보드
        </Text>
        <Text as="p" textStyle="t4Regular" className="dashboardPageDescription">
          주문, 매출, 미처리 업무와 최근 요청을 한 곳에서 확인합니다.
        </Text>
      </header>

      <AdminSegmentedControl
        ariaLabel="대시보드 탭"
        options={DASHBOARD_TABS}
        selectionMode="tab"
        value={activeTab}
        onValueChange={setActiveTab}
      />

      {activeTab === "orders" ? (
        <section
          id="dashboard-orders-panel"
          role="tabpanel"
          aria-labelledby="dashboard-orders-tab"
          className="dashboardTabPanel"
        >
          <DashboardPanel title="주문 지표" titleId="dashboard-period-title">
            <div className="dashboardPeriodControls">
              <AdminSegmentedControl
                ariaLabel="빠른 조회 기간"
                options={DATE_RANGE_PRESETS}
                value={activePreset}
                onValueChange={(preset) =>
                  setDateRange(getPresetDateRange(preset))
                }
              />
              <div className="dashboardDateRange" aria-label="조회 기간">
                <AdminFilterField>
                  <AdminFilterTextField
                    label="시작일"
                    value={dateRange[0]}
                    onValueChange={({ value }) =>
                      setDateRange(([, endDate]) => [value, endDate])
                    }
                    inputProps={{
                      name: "dashboard-date-from",
                      type: "date",
                      max: dateRange[1],
                    }}
                  />
                </AdminFilterField>
                <AdminFilterField>
                  <AdminFilterTextField
                    label="종료일"
                    value={dateRange[1]}
                    onValueChange={({ value }) =>
                      setDateRange(([startDate]) => [startDate, value])
                    }
                    inputProps={{
                      name: "dashboard-date-to",
                      type: "date",
                      min: dateRange[0],
                    }}
                  />
                </AdminFilterField>
              </div>
            </div>
            <DashboardStatsRow stats={stats} />
          </DashboardPanel>

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
          <DashboardPanel title="견적 요청" titleId="dashboard-quotes-title">
            <QuoteRequestDashboardTable />
          </DashboardPanel>
        </section>
      ) : null}
    </main>
  );
}
