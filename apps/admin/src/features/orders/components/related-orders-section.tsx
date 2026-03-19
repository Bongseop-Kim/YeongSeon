import { Empty, Table, Tag } from "antd";
import { Link } from "react-router-dom";
import { ORDER_TYPE_LABELS } from "@yeongseon/shared";
import { useRelatedOrders } from "@/features/orders/api/orders-query";
import type { AdminOrderListItem } from "@/features/orders/types/admin-order";
import type { OrderType } from "@yeongseon/shared";

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
    currentOrderId,
  );

  const shouldShowEmpty =
    !isLoading && (!paymentGroupId || relatedOrders.length === 0);

  const columns = [
    {
      title: "주문번호",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (orderNumber: string, record: AdminOrderListItem) => (
        <Link to={`/orders/show/${record.id}`}>{orderNumber}</Link>
      ),
    },
    {
      title: "유형",
      dataIndex: "orderType",
      key: "orderType",
      render: (orderType: OrderType) => {
        const label = ORDER_TYPE_LABELS[orderType] ?? orderType;
        const colorMap: Record<OrderType, string> = {
          sale: "blue",
          custom: "green",
          repair: "purple",
          token: "gold",
          sample: "cyan",
        };
        return <Tag color={colorMap[orderType] ?? "default"}>{label}</Tag>;
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

  if (shouldShowEmpty) {
    return <Empty description="함께 결제된 주문이 없습니다." />;
  }

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
