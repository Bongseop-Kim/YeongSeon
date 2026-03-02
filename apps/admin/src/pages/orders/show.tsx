import { Show } from "@refinedev/antd";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { Typography } from "antd";
import {
  ORDER_STATUS_FLOW,
  ORDER_ROLLBACK_FLOW,
} from "@yeongseon/shared";
import {
  useAdminOrderDetail,
  useAdminOrderItems,
  useAdminOrderStatusLogs,
  useDefaultCourier,
  useOrderStatusUpdate,
  useTrackingSave,
  useTrackingState,
} from "@/features/orders/api/orders-query";
import { OrderInfoSection } from "@/features/orders/components/order-info-section";
import { OrderStatusActions } from "@/features/orders/components/order-status-actions";
import { CustomOrderDetail } from "@/features/orders/components/custom-order-detail";
import { RepairOrderDetail } from "@/features/orders/components/repair-order-detail";
import { ShippingAddressSection } from "@/features/orders/components/shipping-address-section";
import { TrackingSection } from "@/features/orders/components/tracking-section";
import { OrderItemsTable } from "@/features/orders/components/order-items-table";
import { StatusLogTable } from "@/features/orders/components/status-log-table";
import type { AdminReformOrderItem } from "@/features/orders/types/admin-order";

const { Title } = Typography;

export default function OrderShow() {
  const { id: orderId } = useParams<{ id: string }>();
  const { order, refetch } = useAdminOrderDetail(orderId);
  const orderType = order?.orderType ?? "sale";

  const { items } = useAdminOrderItems(orderId, orderType);
  const { logs } = useAdminOrderStatusLogs(orderId);
  const defaultCourier = useDefaultCourier();

  const { isUpdating, changeStatus, rollback } = useOrderStatusUpdate(
    orderId,
    refetch
  );
  const { saveTracking, isPending: trackingPending } = useTrackingSave();
  const { courierCompany, setCourierCompany, trackingNumber, setTrackingNumber } =
    useTrackingState(order, defaultCourier);

  const [statusMemo, setStatusMemo] = useState("");

  const statusFlow = ORDER_STATUS_FLOW[orderType];
  const rollbackFlow = ORDER_ROLLBACK_FLOW[orderType];
  const nextStatus = order?.status ? statusFlow[order.status] : undefined;
  const rollbackStatus = order?.status ? rollbackFlow[order.status] : undefined;

  const reformItems = items.filter(
    (i): i is AdminReformOrderItem => i.type === "reform"
  );

  return (
    <Show>
      <Title level={5}>주문 정보</Title>
      {order && <OrderInfoSection order={order} />}

      {order && (
        <OrderStatusActions
          order={order}
          nextStatus={nextStatus}
          rollbackStatus={rollbackStatus}
          statusMemo={statusMemo}
          onMemoChange={setStatusMemo}
          onStatusChange={async (newStatus, memo) => {
            await changeStatus(newStatus, memo);
            setStatusMemo("");
          }}
          onRollback={rollback}
          isUpdating={isUpdating}
        />
      )}

      {orderType === "custom" && <CustomOrderDetail items={reformItems} />}
      {orderType === "repair" && <RepairOrderDetail items={reformItems} />}

      <Title level={5}>배송지 정보</Title>
      <ShippingAddressSection address={order?.shippingAddress ?? null} />

      <Title level={5}>배송 정보</Title>
      {orderId && (
        <TrackingSection
          orderId={orderId}
          courierCompany={courierCompany}
          trackingNumber={trackingNumber}
          shippedAt={order?.trackingInfo?.shippedAt}
          onCourierChange={setCourierCompany}
          onTrackingNumberChange={setTrackingNumber}
          onSave={saveTracking}
          isPending={trackingPending}
        />
      )}

      <Title level={5}>주문 아이템</Title>
      <OrderItemsTable items={items} />

      <Title level={5}>상태 변경 이력</Title>
      <StatusLogTable logs={logs} />
    </Show>
  );
}
