import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import { useNavigate } from "react-router-dom";
import { ORDER_TYPE_LABELS } from "@yeongseon/shared";
import { StatusBadge } from "@/components/StatusBadge";
import type { AdminOrderDetail } from "@/features/orders/types/admin-order";
import { formatDateTime } from "@/utils/format-date-time";
import { OrderDetailGrid, OrderDetailItem } from "./order-detail-grid";
import { OrderStatusBadge } from "./order-status-badge";

interface OrderInfoSectionProps {
  order: AdminOrderDetail;
}

export function OrderInfoSection({ order }: OrderInfoSectionProps) {
  const navigate = useNavigate();

  return (
    <OrderDetailGrid>
      <OrderDetailItem label="주문번호">{order.orderNumber}</OrderDetailItem>
      <OrderDetailItem label="주문일">
        {formatDateTime(order.createdAt)}
      </OrderDetailItem>
      <OrderDetailItem label="주문유형">
        <StatusBadge>{ORDER_TYPE_LABELS[order.orderType]}</StatusBadge>
      </OrderDetailItem>
      <OrderDetailItem label="상태">
        <OrderStatusBadge testId="current-status">
          {order.status}
        </OrderStatusBadge>
      </OrderDetailItem>
      <OrderDetailItem label="고객명">
        {order.userId ? (
          <ActionButton
            type="button"
            className="orderLinkButton"
            variant="ghost"
            size="small"
            onClick={() => navigate(`/customers/show/${order.userId}`)}
          >
            {order.customerName}
          </ActionButton>
        ) : (
          order.customerName
        )}
      </OrderDetailItem>
      <OrderDetailItem label="연락처">
        {order.customerPhone ?? "-"}
      </OrderDetailItem>
      <OrderDetailItem label="이메일">
        {order.customerEmail ?? "-"}
      </OrderDetailItem>
      <OrderDetailItem label="결제금액">
        <Text as="strong" textStyle="t5Bold">
          {order.totalPrice.toLocaleString()}원
        </Text>
      </OrderDetailItem>
      <OrderDetailItem label="원가">
        {order.originalPrice.toLocaleString()}원
      </OrderDetailItem>
      <OrderDetailItem label="할인">
        {order.totalDiscount.toLocaleString()}원
      </OrderDetailItem>
      {order.deliveredAt ? (
        <OrderDetailItem label="배송완료일시">
          {formatDateTime(order.deliveredAt)}
        </OrderDetailItem>
      ) : null}
      {order.confirmedAt ? (
        <OrderDetailItem label="구매확정일시">
          {formatDateTime(order.confirmedAt)}
        </OrderDetailItem>
      ) : null}
    </OrderDetailGrid>
  );
}
