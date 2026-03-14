import { useState } from "react";
import { Typography, Tabs } from "antd";
import dayjs from "dayjs";
import {
  useDashboardRecentOrders,
  useDashboardStats,
} from "../api/dashboard-query";
import type { SegmentValue } from "../types/admin-dashboard";
import { DashboardRecentOrders } from "./dashboard-recent-orders";
import { DashboardStatsRow } from "./dashboard-stats-row";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import { QuoteRequestListTable } from "@/features/quote-requests/components/quote-request-list-table";

const { Title } = Typography;

export function DashboardContent() {
  const [activeTab, setActiveTab] = useState<string>("orders");
  const [segment, setSegment] = useState<SegmentValue>("all");
  const [dateRange, setDateRange] = useState<DateRange>([dayjs(), dayjs()]);

  const stats = useDashboardStats(segment, dateRange);
  const recentOrders = useDashboardRecentOrders(segment, dateRange);

  return (
    <>
      <Title level={4}>대시보드</Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "orders",
            label: "주문",
            children: (
              <>
                <div style={{ marginBottom: 16 }}>
                  <DateRangeFilter value={dateRange} onChange={setDateRange} />
                </div>
                <DashboardStatsRow stats={stats} />
                <DashboardRecentOrders
                  segment={segment}
                  onSegmentChange={setSegment}
                  recentOrders={recentOrders}
                />
              </>
            ),
          },
          {
            key: "quotes",
            label: "견적",
            children: (
              <>
                <Title level={5} style={{ marginTop: 0 }}>
                  견적 요청
                </Title>
                <QuoteRequestListTable />
              </>
            ),
          },
        ]}
      />
    </>
  );
}
