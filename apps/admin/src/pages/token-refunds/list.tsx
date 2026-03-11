import { useState } from "react";
import { Tabs, Typography } from "antd";
import { TokenRefundListTable } from "@/features/token-refunds/components/token-refund-list-table";
import type { TokenRefundStatus } from "@/features/token-refunds/types/admin-token-refund";

const { Title } = Typography;

type TabKey = "all" | TokenRefundStatus;

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "all",       label: "전체" },
  { key: "pending",   label: "대기중" },
  { key: "approved",  label: "승인" },
  { key: "rejected",  label: "거절" },
  { key: "cancelled", label: "취소됨" },
];

export default function TokenRefundListPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const statusFilter = activeTab === "all" ? undefined : activeTab;

  return (
    <div style={{ padding: "0 24px 24px" }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        토큰 환불 관리
      </Title>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={TABS.map(({ key, label }) => ({
          key,
          label,
          children: <TokenRefundListTable statusFilter={statusFilter} />,
        }))}
      />
    </div>
  );
}
