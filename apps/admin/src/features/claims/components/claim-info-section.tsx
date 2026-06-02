import { useNavigate } from "react-router-dom";
import { CLAIM_REASON_LABELS, CLAIM_TYPE_LABELS } from "@yeongseon/shared";
import { StatusBadge } from "@/components/StatusBadge";
import { ClaimDetailItem } from "@/features/claims/components/claim-detail-item";
import { getClaimStatusTone } from "@/features/claims/components/claim-status-tone";
import type { AdminClaimDetail } from "@/features/claims/types/admin-claim";
import { formatDateTime } from "@/utils/format-date-time";
import "./claims.css";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";

interface ClaimInfoSectionProps {
  claim: AdminClaimDetail;
}

export function ClaimInfoSection({ claim }: ClaimInfoSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="claimPanel" aria-labelledby="claim-info-title">
      <Text
        as="h2"
        textStyle="t6Bold"
        id="claim-info-title"
        className="claimPanelTitle"
      >
        클레임 정보
      </Text>
      <dl className="claimDetailGrid">
        <ClaimDetailItem label="클레임번호" value={claim.claimNumber} />
        <ClaimDetailItem
          label="접수일"
          value={formatDateTime(claim.createdAt)}
        />
        <ClaimDetailItem
          label="유형"
          value={CLAIM_TYPE_LABELS[claim.claimType]}
        />
        <ClaimDetailItem
          label="상태"
          value={
            <StatusBadge tone={getClaimStatusTone(claim.status)}>
              {claim.status}
            </StatusBadge>
          }
        />
        <ClaimDetailItem
          label="고객명"
          value={
            <ActionButton
              className="claimTextButton"
              type="button"
              variant="ghost"
              size="small"
              onClick={() =>
                navigate(`/customers/show/${claim.customer.userId}`)
              }
            >
              {claim.customer.name}
            </ActionButton>
          }
        />
        <ClaimDetailItem label="연락처" value={claim.customer.phone ?? "-"} />
        <ClaimDetailItem
          label="주문번호"
          value={
            <ActionButton
              className="claimTextButton"
              type="button"
              variant="ghost"
              size="small"
              onClick={() =>
                navigate(`/orders/show/${claim.linkedOrder.orderId}`)
              }
            >
              {claim.linkedOrder.orderNumber}
            </ActionButton>
          }
        />
        <ClaimDetailItem label="상품명" value={claim.productName ?? "-"} />
        <ClaimDetailItem
          label="사유"
          value={CLAIM_REASON_LABELS[claim.reason] ?? claim.reason}
        />
        <ClaimDetailItem label="수량" value={claim.claimQuantity} />
        <ClaimDetailItem label="상세설명" value={claim.description ?? "-"} />
      </dl>
    </section>
  );
}
