import { useParams } from "react-router-dom";
import { Typography, Spin, Result, App } from "antd";
import { ORDER_STATUS_FLOW, ORDER_ROLLBACK_FLOW } from "@yeongseon/shared";
import { useDefaultCourier } from "@/entities/settings";
import {
  useAdminOrderDetail,
  useAdminOrderItems,
  useAdminOrderHistory,
  useOrderStatusUpdate,
  useTrackingSave,
  useTrackingState,
} from "@/features/orders/api/orders-query";
import { ActiveClaimSection } from "@/features/orders/components/active-claim-section";
import { RelatedOrdersSection } from "@/features/orders/components/related-orders-section";
import { OrderInfoSection } from "./order-info-section";
import { OrderStatusActions } from "./order-status-actions";
import { CustomOrderDetail } from "./custom-order-detail";
import { RepairOrderDetail } from "./repair-order-detail";
import { ShippingAddressSection } from "./shipping-address-section";
import { TrackingSection } from "./tracking-section";
import { OrderItemsTable } from "./order-items-table";
import { StatusLogTable } from "./status-log-table";
import type {
  AdminCustomOrderItem,
  AdminReformOrderItem,
  AdminSampleOrderItem,
} from "@/features/orders/types/admin-order";

const { Title } = Typography;

export function OrderDetailSection() {
  const { message } = App.useApp();
  const { id: orderId } = useParams<{ id: string }>();
  const { order, refetch, isLoading, isError } = useAdminOrderDetail(orderId);
  const orderType = order?.orderType ?? "sale";

  const { items } = useAdminOrderItems(orderId, orderType);
  const { logs } = useAdminOrderHistory(orderId);
  const defaultCourier = useDefaultCourier();

  const { isUpdating, changeStatus, rollback } = useOrderStatusUpdate(
    orderId,
    refetch,
  );
  const { saveTracking, isPending: trackingPending } = useTrackingSave(refetch);
  const {
    courierCompany,
    setCourierCompany,
    trackingNumber,
    setTrackingNumber,
    companyCourierCompany,
    setCompanyCourierCompany,
    companyTrackingNumber,
    setCompanyTrackingNumber,
  } = useTrackingState(order, defaultCourier);

  const customItems = items.filter(
    (i): i is AdminCustomOrderItem => i.type === "custom",
  );
  const reformItems = items.filter(
    (i): i is AdminReformOrderItem => i.type === "reform",
  );
  const sampleItems = items.filter(
    (i): i is AdminSampleOrderItem => i.type === "sample",
  );

  const statusFlow = ORDER_STATUS_FLOW[orderType];
  const rollbackFlow = ORDER_ROLLBACK_FLOW[orderType];
  const nextStatus = order?.status ? statusFlow[order.status] : undefined;
  const rollbackStatus = order?.status ? rollbackFlow[order.status] : undefined;

  if (isLoading) return <Spin />;
  if (isError)
    return (
      <Result
        status="error"
        title="오류"
        subTitle="주문 정보를 불러오는 중 오류가 발생했습니다."
      />
    );
  if (!order)
    return (
      <Result
        status="404"
        title="주문 없음"
        subTitle="주문 정보를 찾을 수 없습니다."
      />
    );

  const validateBeforeAdvance = () => {
    if (nextStatus !== "배송완료") return true;

    const isRepairOrder = orderType === "repair";
    const persistedCourierCompany = isRepairOrder
      ? (order.trackingInfo?.companyCourierCompany?.trim() ?? "")
      : (order.trackingInfo?.courierCompany?.trim() ?? "");
    const persistedTrackingNumber = isRepairOrder
      ? (order.trackingInfo?.companyTrackingNumber?.trim() ?? "")
      : (order.trackingInfo?.trackingNumber?.trim() ?? "");
    const draftCourierCompany = isRepairOrder
      ? companyCourierCompany.trim()
      : courierCompany.trim();
    const draftTrackingNumber = isRepairOrder
      ? companyTrackingNumber.trim()
      : trackingNumber.trim();

    if (
      (!persistedCourierCompany || !persistedTrackingNumber) &&
      (!draftCourierCompany || !draftTrackingNumber)
    ) {
      message.error("배송 정보(택배사·송장번호)를 먼저 입력해주세요.");
      return false;
    }
    return true;
  };

  const handleChangeStatus = async (newStatus: string, memoText: string) => {
    if (newStatus !== "배송완료") {
      return changeStatus(newStatus, memoText);
    }

    const isRepairOrder = orderType === "repair";
    const persistedCourierCompany = isRepairOrder
      ? (order.trackingInfo?.companyCourierCompany?.trim() ?? "")
      : (order.trackingInfo?.courierCompany?.trim() ?? "");
    const persistedTrackingNumber = isRepairOrder
      ? (order.trackingInfo?.companyTrackingNumber?.trim() ?? "")
      : (order.trackingInfo?.trackingNumber?.trim() ?? "");
    const draftCourierCompany = isRepairOrder
      ? companyCourierCompany.trim()
      : courierCompany.trim();
    const draftTrackingNumber = isRepairOrder
      ? companyTrackingNumber.trim()
      : trackingNumber.trim();

    if (!persistedCourierCompany || !persistedTrackingNumber) {
      if (!draftCourierCompany || !draftTrackingNumber) {
        message.error("배송 정보(택배사·송장번호)를 먼저 입력해주세요.");
        return false;
      }

      const saved = isRepairOrder
        ? await saveTracking(
            order.id,
            undefined,
            undefined,
            draftCourierCompany,
            draftTrackingNumber,
          )
        : await saveTracking(
            order.id,
            draftCourierCompany,
            draftTrackingNumber,
          );

      if (!saved) {
        return false;
      }
    }

    return changeStatus(newStatus, memoText);
  };

  return (
    <>
      <Title level={5}>주문 정보</Title>
      {order.activeClaim && <ActiveClaimSection claim={order.activeClaim} />}
      <OrderInfoSection order={order} />

      {orderType !== "token" && (
        <>
          <Title level={5}>배송지 정보</Title>
          <ShippingAddressSection address={order.shippingAddress} />
        </>
      )}

      <OrderStatusActions
        order={order}
        nextStatus={nextStatus}
        rollbackStatus={rollbackStatus}
        onStatusChange={handleChangeStatus}
        onRollback={rollback}
        onBeforeAdvance={validateBeforeAdvance}
        isUpdating={isUpdating}
      />

      {order.paymentGroupId && (
        <>
          <Title level={5}>함께 결제된 주문</Title>
          <RelatedOrdersSection
            paymentGroupId={order.paymentGroupId}
            currentOrderId={order.id}
          />
        </>
      )}

      {orderType === "custom" && <CustomOrderDetail items={customItems} />}
      {orderType === "sample" && <CustomOrderDetail items={sampleItems} />}
      {orderType === "repair" && <RepairOrderDetail items={reformItems} />}

      {orderType !== "token" && orderType !== "repair" && (
        <>
          <Title level={5}>배송 정보</Title>
          {orderId && (
            <TrackingSection
              isReadOnly={
                order.status === "배송완료" ||
                order.status === "완료" ||
                order.status === "취소"
              }
              orderId={orderId}
              courierCompany={courierCompany}
              trackingNumber={trackingNumber}
              shippedAt={order.trackingInfo?.shippedAt}
              onCourierChange={setCourierCompany}
              onTrackingNumberChange={setTrackingNumber}
              onSave={(targetOrderId, nextCourierCompany, nextTrackingNumber) =>
                void saveTracking(
                  targetOrderId,
                  nextCourierCompany,
                  nextTrackingNumber,
                )
              }
              isPending={trackingPending}
            />
          )}
        </>
      )}

      {orderType === "repair" && orderId && (
        <>
          <Title level={5}>배송 정보</Title>
          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={5} type="secondary">
              고객→회사 배송 정보
            </Typography.Title>
            <TrackingSection
              isReadOnly
              orderId={orderId}
              courierCompany={order.trackingInfo?.courierCompany ?? ""}
              trackingNumber={order.trackingInfo?.trackingNumber ?? ""}
              shippedAt={order.trackingInfo?.shippedAt ?? null}
            />
          </div>

          <div>
            <Typography.Title level={5} type="secondary">
              회사→고객 배송 정보
            </Typography.Title>
            <TrackingSection
              isReadOnly={!["수선완료", "배송중"].includes(order.status)}
              orderId={orderId}
              courierCompany={companyCourierCompany}
              trackingNumber={companyTrackingNumber}
              shippedAt={order.trackingInfo?.companyShippedAt ?? null}
              onCourierChange={setCompanyCourierCompany}
              onTrackingNumberChange={setCompanyTrackingNumber}
              onSave={(targetOrderId, compCourier, compTracking) =>
                void saveTracking(
                  targetOrderId,
                  undefined,
                  undefined,
                  compCourier,
                  compTracking,
                )
              }
              isPending={trackingPending}
            />
          </div>
        </>
      )}

      <Title level={5}>주문 아이템</Title>
      <OrderItemsTable items={items} />

      <Title level={5}>상태 변경 이력</Title>
      <StatusLogTable logs={logs} />
    </>
  );
}
