import { Show } from "@refinedev/antd";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { Typography } from "antd";
import { CLAIM_STATUS_FLOW, CLAIM_ROLLBACK_FLOW } from "@yeongseon/shared";
import {
  useAdminClaimDetail,
  useAdminClaimStatusLogs,
  useClaimStatusUpdate,
  useClaimTrackingSave,
  useClaimTrackingState,
} from "@/features/claims/api/claims-query";
import { ClaimInfoSection } from "@/features/claims/components/claim-info-section";
import { OrderShippingSection } from "@/features/claims/components/order-shipping-section";
import { ClaimTrackingSection } from "@/features/claims/components/claim-tracking-section";
import { ClaimStatusActions } from "@/features/claims/components/claim-status-actions";
import { ClaimStatusLogTable } from "@/features/claims/components/claim-status-log-table";

const { Title } = Typography;

export default function ClaimShow() {
  const { id: claimId } = useParams<{ id: string }>();
  const { claim, refetch } = useAdminClaimDetail(claimId);

  const { logs } = useAdminClaimStatusLogs(claimId);
  const { isUpdating, changeStatus, rollback } = useClaimStatusUpdate(
    claimId,
    refetch
  );
  const { saveTracking, isPending: trackingPending } = useClaimTrackingSave();

  const returnTrackingState = useClaimTrackingState(
    claim?.returnTracking,
    claimId
  );
  const resendTrackingState = useClaimTrackingState(
    claim?.resendTracking,
    claimId
  );

  const [statusMemo, setStatusMemo] = useState("");

  const claimType = claim?.claimType;
  const statusFlow = claimType ? CLAIM_STATUS_FLOW[claimType] : undefined;
  const nextStatus = claim?.status && statusFlow ? statusFlow[claim.status] : undefined;

  const rollbackFlow = claimType ? CLAIM_ROLLBACK_FLOW[claimType] : undefined;
  const rollbackStatus =
    claim?.status && rollbackFlow ? rollbackFlow[claim.status] : undefined;

  const showReturnSection =
    claimType === "return" || claimType === "exchange";
  const showResendSection = claimType === "exchange";

  return (
    <Show>
      <Title level={5}>클레임 정보</Title>
      {claim && <ClaimInfoSection claim={claim} />}

      <Title level={5}>주문 배송 정보</Title>
      {claim && <OrderShippingSection shipping={claim.orderShipping} />}

      {showReturnSection && claimId && (
        <>
          <Title level={5}>수거 정보</Title>
          <ClaimTrackingSection
            claimId={claimId}
            trackingType="return"
            courierCompany={returnTrackingState.courierCompany}
            trackingNumber={returnTrackingState.trackingNumber}
            onCourierChange={returnTrackingState.setCourierCompany}
            onTrackingNumberChange={returnTrackingState.setTrackingNumber}
            onSave={saveTracking}
            isPending={trackingPending}
          />
        </>
      )}

      {showResendSection && claimId && (
        <>
          <Title level={5}>재발송 정보</Title>
          <ClaimTrackingSection
            claimId={claimId}
            trackingType="resend"
            courierCompany={resendTrackingState.courierCompany}
            trackingNumber={resendTrackingState.trackingNumber}
            onCourierChange={resendTrackingState.setCourierCompany}
            onTrackingNumberChange={resendTrackingState.setTrackingNumber}
            onSave={saveTracking}
            isPending={trackingPending}
          />
        </>
      )}

      {claim && (
        <ClaimStatusActions
          claim={claim}
          nextStatus={nextStatus}
          rollbackStatus={rollbackStatus}
          statusMemo={statusMemo}
          onMemoChange={setStatusMemo}
          onStatusChange={async (newStatus, memo) => {
            const ok = await changeStatus(newStatus, memo);
            if (ok) setStatusMemo("");
          }}
          onRollback={rollback}
          isUpdating={isUpdating}
        />
      )}

      <Title level={5}>상태 변경 이력</Title>
      <ClaimStatusLogTable logs={logs} />
    </Show>
  );
}
