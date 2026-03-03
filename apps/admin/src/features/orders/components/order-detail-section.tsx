import { useState } from "react";
import { useParams } from "react-router-dom";
import { Typography, Spin, Result } from "antd";
import { ORDER_STATUS_FLOW, ORDER_ROLLBACK_FLOW } from "@yeongseon/shared";
import {
  useAdminOrderDetail,
  useAdminOrderItems,
  useAdminOrderStatusLogs,
  useDefaultCourier,
  useOrderStatusUpdate,
  useTrackingSave,
  useTrackingState,
} from "../api/orders-query";
import { OrderInfoSection } from "./order-info-section";
import { OrderStatusActions } from "./order-status-actions";
import { CustomOrderDetail } from "./custom-order-detail";
import { RepairOrderDetail } from "./repair-order-detail";
import { ShippingAddressSection } from "./shipping-address-section";
import { TrackingSection } from "./tracking-section";
import { OrderItemsTable } from "./order-items-table";
import { StatusLogTable } from "./status-log-table";
import type { AdminReformOrderItem } from "../types/admin-order";

const { Title } = Typography;

export function OrderDetailSection() {
  const { id: orderId } = useParams<{ id: string }>();
  const { order, refetch, isLoading, isError } = useAdminOrderDetail(orderId);
  const orderType = order?.orderType ?? "sale";

  const { items } = useAdminOrderItems(orderId, orderType);
  const { logs } = useAdminOrderStatusLogs(orderId);
  const defaultCourier = useDefaultCourier();

  const { isUpdating, changeStatus, rollback } = useOrderStatusUpdate(orderId, refetch);
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

  if (isLoading) return <Spin />;
  if (isError) return <Result status="error" title="오류" subTitle="주문 정보를 불러오는 중 오류가 발생했습니다." />;
  if (!order) return <Result status="404" title="주문 없음" subTitle="주문 정보를 찾을 수 없습니다." />;

  return (
    <>
      <Title level={5}>주문 정보</Title>
      <OrderInfoSection order={order} />

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

      {orderType === "custom" && <CustomOrderDetail items={reformItems} />}
      {orderType === "repair" && <RepairOrderDetail items={reformItems} />}

      <Title level={5}>배송지 정보</Title>
      <ShippingAddressSection address={order.shippingAddress} />

      <Title level={5}>배송 정보</Title>
      {orderId && (
        <TrackingSection
          orderId={orderId}
          courierCompany={courierCompany}
          trackingNumber={trackingNumber}
          shippedAt={order.trackingInfo?.shippedAt}
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
    </>
  );
}
