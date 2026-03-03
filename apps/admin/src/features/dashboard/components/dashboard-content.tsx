import { useState } from "react";
import { Typography } from "antd";
import {
  useDashboardRecentOrders,
  useDashboardStats,
} from "../api/dashboard-query";
import type { SegmentValue } from "../types/admin-dashboard";
import { DashboardRecentOrders } from "./dashboard-recent-orders";
import { DashboardStatsRow } from "./dashboard-stats-row";

const { Title } = Typography;

export function DashboardContent() {
  const [segment, setSegment] = useState<SegmentValue>("all");
  const stats = useDashboardStats(segment);
  const recentOrders = useDashboardRecentOrders(segment);

  return (
    <>
      <Title level={4}>대시보드</Title>
      <DashboardStatsRow stats={stats} />
      <DashboardRecentOrders
        segment={segment}
        onSegmentChange={setSegment}
        recentOrders={recentOrders}
      />
    </>
  );
}
