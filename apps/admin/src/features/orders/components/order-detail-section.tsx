import { Text } from "seed-design/ui/text";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ORDER_ROLLBACK_FLOW, ORDER_STATUS_FLOW } from "@yeongseon/shared";
import { Callout } from "seed-design/ui/callout";
import { useDefaultCourier } from "@/entities/settings";
import {
  useAdminOrderDetail,
  useAdminOrderHistory,
  useAdminOrderItems,
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="orderPanel" aria-labelledby={`order-section-${title}`}>
      <div className="orderPanelHeader">
        <Text
          as="h2"
          textStyle="t6Bold"
          id={`order-section-${title}`}
          className="orderSectionTitle"
        >
          {title}
        </Text>
      </div>
      {children}
    </section>
  );
}

export function OrderDetailSection() {
  const { id: orderId } = useParams<{ id: string }>();
  const [shippingValidationError, setShippingValidationError] = useState<
    string | null
  >(null);
  const { order, refetch, isLoading, isError, error } =
    useAdminOrderDetail(orderId);
  const orderType = order?.orderType ?? "sale";
  const itemsQuery = useAdminOrderItems(orderId, orderType);
  const historyQuery = useAdminOrderHistory(orderId);
  const defaultCourier = useDefaultCourier();
  const statusUpdate = useOrderStatusUpdate(orderId, refetch);
  const trackingSave = useTrackingSave(refetch);
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

  if (isLoading) {
    return (
      <Text
        as="p"
        textStyle="t4Regular"
        className="orderMutedText"
        aria-live="polite"
      >
        불러오는 중…
      </Text>
    );
  }

  if (isError) {
    return (
      <Callout
        tone="critical"
        title="주문 정보를 불러오지 못했습니다"
        description={error?.message ?? "알 수 없는 오류"}
        role="alert"
        linkProps={{ children: "다시 시도", onClick: () => void refetch() }}
      />
    );
  }

  if (!order) {
    return (
      <Callout
        tone="critical"
        title="주문 없음"
        description="주문 정보를 찾을 수 없습니다."
        role="alert"
      />
    );
  }

  const items = itemsQuery.items;
  const customItems = items.filter(
    (item): item is AdminCustomOrderItem => item.type === "custom",
  );
  const reformItems = items.filter(
    (item): item is AdminReformOrderItem => item.type === "reform",
  );
  const sampleItems = items.filter(
    (item): item is AdminSampleOrderItem => item.type === "sample",
  );
  const statusFlow = ORDER_STATUS_FLOW[orderType];
  const rollbackFlow = ORDER_ROLLBACK_FLOW[orderType];
  const nextStatus = order.status ? statusFlow[order.status] : undefined;
  const rollbackStatus = order.status ? rollbackFlow[order.status] : undefined;

  const getShippingFields = (isRepairOrder: boolean) => ({
    persistedCourierCompany: isRepairOrder
      ? (order.trackingInfo?.companyCourierCompany?.trim() ?? "")
      : (order.trackingInfo?.courierCompany?.trim() ?? ""),
    persistedTrackingNumber: isRepairOrder
      ? (order.trackingInfo?.companyTrackingNumber?.trim() ?? "")
      : (order.trackingInfo?.trackingNumber?.trim() ?? ""),
    draftCourierCompany: isRepairOrder
      ? companyCourierCompany.trim()
      : courierCompany.trim(),
    draftTrackingNumber: isRepairOrder
      ? companyTrackingNumber.trim()
      : trackingNumber.trim(),
  });

  const isShippingInfoMissing = (isRepairOrder: boolean) => {
    const fields = getShippingFields(isRepairOrder);
    return (
      (!fields.persistedCourierCompany || !fields.persistedTrackingNumber) &&
      (!fields.draftCourierCompany || !fields.draftTrackingNumber)
    );
  };

  const validateBeforeAdvance = () => {
    setShippingValidationError(null);
    if (nextStatus !== "배송완료") return true;
    if (isShippingInfoMissing(orderType === "repair")) {
      setShippingValidationError(
        "배송 정보(택배사·송장번호)를 먼저 입력해주세요.",
      );
      return false;
    }
    return true;
  };

  const handleChangeStatus = async (newStatus: string, memoText: string) => {
    setShippingValidationError(null);
    if (newStatus !== "배송완료") {
      return statusUpdate.changeStatus(newStatus, memoText);
    }

    const isRepairOrder = orderType === "repair";
    if (isShippingInfoMissing(isRepairOrder)) {
      setShippingValidationError(
        "배송 정보(택배사·송장번호)를 먼저 입력해주세요.",
      );
      return false;
    }

    const fields = getShippingFields(isRepairOrder);
    if (!fields.persistedCourierCompany || !fields.persistedTrackingNumber) {
      const saved = isRepairOrder
        ? await trackingSave.saveTracking(
            order.id,
            undefined,
            undefined,
            fields.draftCourierCompany,
            fields.draftTrackingNumber,
          )
        : await trackingSave.saveTracking(
            order.id,
            fields.draftCourierCompany,
            fields.draftTrackingNumber,
          );

      if (!saved) return false;
    }

    return statusUpdate.changeStatus(newStatus, memoText);
  };

  return (
    <>
      {order.activeClaim ? (
        <ActiveClaimSection claim={order.activeClaim} />
      ) : null}
      <Section title="주문 정보">
        <OrderInfoSection order={order} />
      </Section>

      {orderType !== "token" ? (
        <Section title="배송지 정보">
          <ShippingAddressSection address={order.shippingAddress} />
        </Section>
      ) : null}

      {statusUpdate.notice ? (
        <Callout
          tone="positive"
          description={statusUpdate.notice}
          role="status"
        />
      ) : null}
      {statusUpdate.errorMessage ? (
        <Callout
          tone="critical"
          description={statusUpdate.errorMessage}
          role="alert"
        />
      ) : null}
      {trackingSave.notice ? (
        <Callout
          tone="positive"
          description={trackingSave.notice}
          role="status"
        />
      ) : null}
      {trackingSave.errorMessage ? (
        <Callout
          tone="critical"
          description={trackingSave.errorMessage}
          role="alert"
        />
      ) : null}
      {shippingValidationError ? (
        <Callout
          tone="critical"
          description={shippingValidationError}
          role="alert"
        />
      ) : null}

      <OrderStatusActions
        order={order}
        nextStatus={nextStatus}
        rollbackStatus={rollbackStatus}
        onStatusChange={handleChangeStatus}
        onRollback={statusUpdate.rollback}
        onBeforeAdvance={validateBeforeAdvance}
        isUpdating={statusUpdate.isUpdating}
      />

      {order.paymentGroupId ? (
        <Section title="함께 결제된 주문">
          <RelatedOrdersSection
            paymentGroupId={order.paymentGroupId}
            currentOrderId={order.id}
          />
        </Section>
      ) : null}

      {orderType === "custom" ? (
        <CustomOrderDetail items={customItems} />
      ) : null}
      {orderType === "sample" ? (
        <CustomOrderDetail items={sampleItems} />
      ) : null}
      {orderType === "repair" ? (
        <RepairOrderDetail items={reformItems} />
      ) : null}

      {orderType !== "token" && orderType !== "repair" && orderId ? (
        <Section title="배송 정보">
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
              void trackingSave.saveTracking(
                targetOrderId,
                nextCourierCompany,
                nextTrackingNumber,
              )
            }
            isPending={trackingSave.isPending}
          />
        </Section>
      ) : null}

      {orderType === "repair" && orderId ? (
        <Section title="배송 정보">
          <div className="orderOptionCard">
            <Text as="h3" textStyle="t5Bold" className="orderSubsectionTitle">
              고객→회사 배송 정보
            </Text>
            <TrackingSection
              isReadOnly
              orderId={orderId}
              courierCompany={order.trackingInfo?.courierCompany ?? ""}
              trackingNumber={order.trackingInfo?.trackingNumber ?? ""}
              shippedAt={order.trackingInfo?.shippedAt ?? null}
            />
          </div>
          <div className="orderOptionCard">
            <Text as="h3" textStyle="t5Bold" className="orderSubsectionTitle">
              회사→고객 배송 정보
            </Text>
            <TrackingSection
              isReadOnly={!["수선완료", "배송중"].includes(order.status)}
              orderId={orderId}
              courierCompany={companyCourierCompany}
              trackingNumber={companyTrackingNumber}
              shippedAt={order.trackingInfo?.companyShippedAt ?? null}
              onCourierChange={setCompanyCourierCompany}
              onTrackingNumberChange={setCompanyTrackingNumber}
              onSave={(targetOrderId, compCourier, compTracking) =>
                void trackingSave.saveTracking(
                  targetOrderId,
                  undefined,
                  undefined,
                  compCourier,
                  compTracking,
                )
              }
              isPending={trackingSave.isPending}
            />
          </div>
        </Section>
      ) : null}

      <Section title="주문 아이템">
        {itemsQuery.error ? (
          <Callout tone="critical" description={itemsQuery.error.message} />
        ) : null}
        {itemsQuery.isLoading ? (
          <Text as="p" textStyle="t4Regular" className="orderMutedText">
            불러오는 중…
          </Text>
        ) : null}
        <OrderItemsTable items={items} />
      </Section>

      <Section title="상태 변경 이력">
        {historyQuery.error ? (
          <Callout tone="critical" description={historyQuery.error.message} />
        ) : null}
        {historyQuery.isLoading ? (
          <Text as="p" textStyle="t4Regular" className="orderMutedText">
            불러오는 중…
          </Text>
        ) : null}
        <StatusLogTable logs={historyQuery.logs} />
      </Section>
    </>
  );
}
