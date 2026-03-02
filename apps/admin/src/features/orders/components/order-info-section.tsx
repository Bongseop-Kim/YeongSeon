import { Descriptions, Tag } from "antd";
import { useNavigation } from "@refinedev/core";
import {
  ORDER_TYPE_LABELS,
  ORDER_STATUS_COLORS,
} from "@yeongseon/shared";
import type { AdminOrderDetail } from "../types/admin-order";

interface OrderInfoSectionProps {
  order: AdminOrderDetail;
}

export function OrderInfoSection({ order }: OrderInfoSectionProps) {
  const { show } = useNavigation();

  return (
    <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} style={{ marginBottom: 24 }}>
      <Descriptions.Item label="주문번호">{order.orderNumber}</Descriptions.Item>
      <Descriptions.Item label="주문일">{order.date}</Descriptions.Item>
      <Descriptions.Item label="주문유형">
        <Tag>{ORDER_TYPE_LABELS[order.orderType]}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="상태">
        <Tag color={ORDER_STATUS_COLORS[order.status]}>{order.status}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="고객명">
        {order.userId ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              show("profiles", order.userId);
            }}
            style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
          >
            {order.customerName}
          </button>
        ) : (
          order.customerName
        )}
      </Descriptions.Item>
      <Descriptions.Item label="연락처">
        {order.customerPhone ?? "-"}
      </Descriptions.Item>
      <Descriptions.Item label="이메일">
        {order.customerEmail ?? "-"}
      </Descriptions.Item>
      <Descriptions.Item label="결제금액">
        <strong>{order.totalPrice.toLocaleString()}원</strong>
      </Descriptions.Item>
      <Descriptions.Item label="원가">
        {order.originalPrice.toLocaleString()}원
      </Descriptions.Item>
      <Descriptions.Item label="할인">
        {order.totalDiscount.toLocaleString()}원
      </Descriptions.Item>
    </Descriptions>
  );
}
