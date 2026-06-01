import { Text } from "seed-design/ui/text";
import { useParams } from "react-router-dom";
import { CLAIM_ROLLBACK_FLOW, CLAIM_STATUS_FLOW } from "@yeongseon/shared";
import { Callout } from "seed-design/ui/callout";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import {
  ClaimInfoSection,
  ClaimStatusActions,
  ClaimStatusLogTable,
  ClaimTrackingSection,
  OrderShippingSection,
  useAdminClaimDetail,
  useAdminClaimStatusLogs,
  useClaimStatusUpdate,
  useClaimTrackingSave,
  useClaimTrackingState,
} from "@/features/claims";
import type { AdminClaimStatusLogEntry } from "@/features/claims/types/admin-claim";
import "@/features/claims/components/claims.css";

const EMPTY_CLAIM_STATUS_LOGS: AdminClaimStatusLogEntry[] = [];

export default function ClaimShow() {
  const { id: claimId } = useParams<{ id: string }>();
  const claimQuery = useAdminClaimDetail(claimId);
  const claim = claimQuery.claim;
  const logsQuery = useAdminClaimStatusLogs(claimId);
  const {
    isUpdating,
    changeStatus,
    rollback,
    error: statusError,
    successMessage: statusSuccessMessage,
    notificationWarning,
  } = useClaimStatusUpdate(claimId);
  const {
    saveTracking,
    isPending: trackingPending,
    error: trackingError,
    successMessage: trackingSuccessMessage,
  } = useClaimTrackingSave(claimId);

  const returnTrackingState = useClaimTrackingState(
    claim?.returnTracking,
    claimId,
  );
  const resendTrackingState = useClaimTrackingState(
    claim?.resendTracking,
    claimId,
  );

  const claimType = claim?.claimType;
  const statusFlow = claimType ? CLAIM_STATUS_FLOW[claimType] : undefined;
  const nextStatus =
    claim?.status && statusFlow ? statusFlow[claim.status] : undefined;

  const rollbackFlow = claimType ? CLAIM_ROLLBACK_FLOW[claimType] : undefined;
  const rollbackStatus =
    claim?.status && rollbackFlow ? rollbackFlow[claim.status] : undefined;

  const showReturnSection = claimType === "return" || claimType === "exchange";
  const showResendSection = claimType === "exchange";

  return (
    <main className="claimPage">
      <header className="claimHeader">
        <Text as="h1" textStyle="screenTitle" className="claimTitle">
          클레임 상세
        </Text>
        <Text as="p" textStyle="t4Regular" className="claimDescription">
          클레임 정보, 주문 배송, 수거·재발송 송장, 상태 이력을 관리합니다.
        </Text>
      </header>

      {claimQuery.isLoading ? <AdminPanelSkeleton lines={5} /> : null}
      {claimQuery.error ? (
        <Callout tone="critical" description={claimQuery.error.message} />
      ) : null}
      {!claimQuery.isLoading && !claimQuery.error && !claim ? (
        <Callout tone="warning" description="클레임 정보를 찾을 수 없습니다." />
      ) : null}

      {statusSuccessMessage ? (
        <Callout tone="positive" description={statusSuccessMessage} />
      ) : null}
      {notificationWarning ? (
        <Callout tone="warning" description={notificationWarning} />
      ) : null}
      {statusError ? (
        <Callout
          tone="critical"
          description={`상태 변경 실패: ${statusError.message}`}
        />
      ) : null}
      {trackingSuccessMessage ? (
        <Callout tone="positive" description={trackingSuccessMessage} />
      ) : null}
      {trackingError ? (
        <Callout
          tone="critical"
          description={`배송 정보 저장 실패: ${trackingError.message}`}
        />
      ) : null}

      {claim ? <ClaimInfoSection claim={claim} /> : null}
      {claim ? <OrderShippingSection shipping={claim.orderShipping} /> : null}

      {showReturnSection && claimId ? (
        <ClaimTrackingSection
          trackingType="return"
          courierCompany={returnTrackingState.courierCompany}
          trackingNumber={returnTrackingState.trackingNumber}
          onCourierChange={returnTrackingState.setCourierCompany}
          onTrackingNumberChange={returnTrackingState.setTrackingNumber}
          onSave={() => {
            void saveTracking(
              "return",
              returnTrackingState.courierCompany,
              returnTrackingState.trackingNumber,
            );
          }}
          isPending={trackingPending}
        />
      ) : null}

      {showResendSection && claimId ? (
        <ClaimTrackingSection
          trackingType="resend"
          courierCompany={resendTrackingState.courierCompany}
          trackingNumber={resendTrackingState.trackingNumber}
          onCourierChange={resendTrackingState.setCourierCompany}
          onTrackingNumberChange={resendTrackingState.setTrackingNumber}
          onSave={() => {
            void saveTracking(
              "resend",
              resendTrackingState.courierCompany,
              resendTrackingState.trackingNumber,
            );
          }}
          isPending={trackingPending}
        />
      ) : null}

      {claim ? (
        <ClaimStatusActions
          claim={claim}
          nextStatus={nextStatus}
          rollbackStatus={rollbackStatus}
          onStatusChange={changeStatus}
          onRollback={rollback}
          isUpdating={isUpdating}
        />
      ) : null}

      <section className="claimPanel" aria-labelledby="claim-status-log-title">
        <div className="claimPanelHeader">
          <div>
            <Text
              as="h2"
              textStyle="t6Bold"
              id="claim-status-log-title"
              className="claimPanelTitle"
            >
              상태 변경 이력
            </Text>
          </div>
        </div>
        {logsQuery.error ? (
          <Callout tone="critical" description={logsQuery.error.message} />
        ) : null}
        <ClaimStatusLogTable
          logs={logsQuery.data ?? EMPTY_CLAIM_STATUS_LOGS}
          isLoading={logsQuery.isFetching}
        />
      </section>
    </main>
  );
}
