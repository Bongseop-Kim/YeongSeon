import { Table, Tag } from "antd";
import { Link } from "react-router-dom";
import { useRelatedOrders } from "@/features/orders/api/orders-query";
import type { AdminOrderListItem } from "@/features/orders/types/admin-order";

interface RelatedOrdersSectionProps {
  paymentGroupId: string | null;
  currentOrderId: string;
}

export function RelatedOrdersSection({
  paymentGroupId,
  currentOrderId,
}: RelatedOrdersSectionProps) {
  const { relatedOrders, isLoading } = useRelatedOrders(
    paymentGroupId,
    currentOrderId
  );

  if (!paymentGroupId || (!isLoading && relatedOrders.length === 0)) {
    return null;
  }

  const columns = [
    {
      title: "주문번호",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (orderNumber: string, record: AdminOrderListItem) => (
        <Link to={`/orders/${record.id}`}>{orderNumber}</Link>
      ),
    },
    {
      title: "유형",
      dataIndex: "orderType",
      key: "orderType",
      render: (orderType: string) => {
        const label = orderType === "sale" ? "일반" : "수선";
        const color = orderType === "sale" ? "blue" : "purple";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
    },
    {
      title: "금액",
      dataIndex: "totalPrice",
      key: "totalPrice",
      render: (price: number) => `${price.toLocaleString()}원`,
    },
  ];

  return (
    <Table<AdminOrderListItem>
      columns={columns}
      dataSource={relatedOrders}
      rowKey="id"
      loading={isLoading}
      pagination={false}
      size="small"
    />
  );
}
