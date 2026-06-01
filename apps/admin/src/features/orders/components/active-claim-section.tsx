import { useNavigate } from "react-router-dom";
import { CLAIM_TYPE_LABELS } from "@yeongseon/shared";
import { ActionButton } from "seed-design/ui/action-button";
import { StatusBadge } from "@/components/StatusBadge";
import type { AdminActiveClaimSummary } from "@/features/orders/types/admin-order";
import { OrderDetailGrid, OrderDetailItem } from "./order-detail-grid";
import { Text } from "seed-design/ui/text";

interface ActiveClaimSectionProps {
  claim: AdminActiveClaimSummary;
}

export function ActiveClaimSection({ claim }: ActiveClaimSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="orderPanel" aria-labelledby="active-claim-title">
      <div className="orderPanelHeader">
        <Text
          as="h2"
          textStyle="t6Bold"
          id="active-claim-title"
          className="orderSectionTitle"
        >
          활성 클레임
        </Text>
        <ActionButton
          type="button"
          variant="neutralWeak"
          onClick={() => navigate(`/claims/show/${claim.id}`)}
        >
          클레임 상세 바로가기
        </ActionButton>
      </div>
      <OrderDetailGrid>
        <OrderDetailItem label="클레임번호">
          {claim.claimNumber}
        </OrderDetailItem>
        <OrderDetailItem label="유형">
          {CLAIM_TYPE_LABELS[claim.type]}
        </OrderDetailItem>
        <OrderDetailItem label="상태">
          <StatusBadge>{claim.status}</StatusBadge>
        </OrderDetailItem>
        <OrderDetailItem label="요청 수량">{claim.quantity}</OrderDetailItem>
      </OrderDetailGrid>
    </section>
  );
}
