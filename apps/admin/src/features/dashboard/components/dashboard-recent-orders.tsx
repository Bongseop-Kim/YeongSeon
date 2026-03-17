import { useNavigation } from "@refinedev/core";
import { Segmented, Table, Tag, Typography } from "antd";
import type { OrderType } from "@yeongseon/shared";
import { ORDER_STATUS_COLORS, ORDER_TYPE_LABELS } from "@yeongseon/shared";
import type {
  AdminDashboardRecentOrder,
  SegmentValue,
} from "@/features/dashboard/types/admin-dashboard";

const { Title } = Typography;

const SEGMENT_OPTIONS: { label: string; value: SegmentValue }[] = [
  { label: "전체", value: "all" },
  { label: ORDER_TYPE_LABELS.sale, value: "sale" },
  { label: ORDER_TYPE_LABELS.custom, value: "custom" },
  { label: ORDER_TYPE_LABELS.repair, value: "repair" },
  { label: ORDER_TYPE_LABELS.token, value: "token" },
];

export function DashboardRecentOrders({
  segment,
  onSegmentChange,
  recentOrders,
}: {
  segment: SegmentValue;
  onSegmentChange: (v: SegmentValue) => void;
  recentOrders: AdminDashboardRecentOrder[];
}) {
  const { show } = useNavigation();

  return (
    <>
      <Segmented
        options={SEGMENT_OPTIONS}
        value={segment}
        onChange={(val) => {
          const valid = SEGMENT_OPTIONS.find((option) => option.value === val);
          if (valid) onSegmentChange(valid.value);
        }}
        style={{ marginBottom: 16 }}
      />

      <Title level={5}>최근 주문</Title>
      <Table
        dataSource={recentOrders}
        rowKey="id"
        pagination={false}
        size="small"
        onRow={(record) => ({
          onClick: () => show("admin_order_list_view", record.id),
          tabIndex: 0,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              show("admin_order_list_view", record.id);
            }
          },
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="orderNumber" title="주문번호" />
        <Table.Column dataIndex="date" title="주문일" />
        <Table.Column dataIndex="customerName" title="고객명" />
        <Table.Column
          dataIndex="orderType"
          title="유형"
          render={(v: OrderType) => ORDER_TYPE_LABELS[v] ?? v}
        />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string) => <Tag color={ORDER_STATUS_COLORS[v]}>{v}</Tag>}
        />
        <Table.Column
          dataIndex="totalPrice"
          title="결제금액"
          render={(v: number | null) =>
            v != null ? `${v.toLocaleString()}원` : "-"
          }
        />
      </Table>
    </>
  );
}
