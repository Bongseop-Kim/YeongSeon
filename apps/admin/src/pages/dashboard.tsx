import { useState } from "react";
import { useList, useNavigation } from "@refinedev/core";
import { Card, Col, Row, Segmented, Statistic, Table, Tag, Typography } from "antd";
import {
  ShoppingOutlined,
  DollarOutlined,
  ExceptionOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type { AdminOrderListRowDTO, OrderType } from "@yeongseon/shared";
import { ORDER_TYPE_LABELS, ORDER_STATUS_COLORS } from "@yeongseon/shared";

const { Title } = Typography;

type SegmentValue = OrderType | "all";

const SEGMENT_OPTIONS: { label: string; value: SegmentValue }[] = [
  { label: "전체", value: "all" },
  { label: ORDER_TYPE_LABELS.sale, value: "sale" },
  { label: ORDER_TYPE_LABELS.custom, value: "custom" },
  { label: ORDER_TYPE_LABELS.repair, value: "repair" },
];

export default function DashboardPage() {
  const { show } = useNavigation();
  const today = new Date().toISOString().slice(0, 10);
  const [segment, setSegment] = useState<SegmentValue>("all");

  const orderTypeFilter =
    segment !== "all"
      ? [{ field: "orderType" as const, operator: "eq" as const, value: segment }]
      : [];

  const { result: todayOrdersResult } = useList<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    filters: [
      { field: "date", operator: "eq", value: today },
      ...orderTypeFilter,
    ],
    pagination: { pageSize: 1000 },
  });

  const { result: recentOrdersResult } = useList<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    sorters: [{ field: "created_at", order: "desc" }],
    filters: orderTypeFilter,
    pagination: { pageSize: 5 },
  });

  const { result: pendingClaimsResult } = useList({
    resource: "admin_claim_list_view",
    filters: [
      {
        operator: "or",
        value: [
          { field: "status", operator: "eq", value: "접수" },
          { field: "status", operator: "eq", value: "처리중" },
        ],
      },
    ],
    pagination: { pageSize: 1 },
  });

  const { result: pendingInquiriesResult } = useList({
    resource: "inquiries",
    filters: [{ field: "status", operator: "eq", value: "답변대기" }],
    pagination: { pageSize: 1 },
  });

  const todayOrderCount = todayOrdersResult.data?.length ?? 0;
  const todayRevenue =
    todayOrdersResult.data?.reduce(
      (sum: number, o: AdminOrderListRowDTO) => sum + (o.totalPrice ?? 0),
      0
    ) ?? 0;

  return (
    <>
      <Title level={4}>대시보드</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="오늘 주문"
              value={todayOrderCount}
              suffix="건"
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="오늘 매출"
              value={todayRevenue}
              suffix="원"
              prefix={<DollarOutlined />}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="미처리 클레임"
              value={pendingClaimsResult.total ?? 0}
              suffix="건"
              prefix={<ExceptionOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="미답변 문의"
              value={pendingInquiriesResult.total ?? 0}
              suffix="건"
              prefix={<QuestionCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Segmented
        options={SEGMENT_OPTIONS}
        value={segment}
        onChange={(val) => {
          const valid = SEGMENT_OPTIONS.find((o) => o.value === val);
          if (valid) setSegment(valid.value);
        }}
        style={{ marginBottom: 16 }}
      />

      <Title level={5}>최근 주문</Title>
      <Table
        dataSource={recentOrdersResult.data}
        rowKey="id"
        pagination={false}
        size="small"
        onRow={(record) => ({
          onClick: () => show("admin_order_list_view", record.id),
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
