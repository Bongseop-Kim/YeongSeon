import { buildTrackingUrl } from "@yeongseon/shared";
import { StatusBadge } from "@/components/StatusBadge";
import { ClaimDetailItem } from "@/features/claims/components/claim-detail-item";
import { getOrderStatusTone } from "@/features/claims/components/claim-status-tone";
import type { AdminClaimOrderShipping } from "@/features/claims/types/admin-claim";
import { formatDateTime } from "@/utils/format-date-time";
import "./claims.css";
import { Text } from "seed-design/ui/text";

interface OrderShippingSectionProps {
  shipping: AdminClaimOrderShipping;
}

export function OrderShippingSection({ shipping }: OrderShippingSectionProps) {
  const trackingUrl =
    shipping.courierCompany && shipping.trackingNumber
      ? buildTrackingUrl(shipping.courierCompany, shipping.trackingNumber)
      : null;

  return (
    <section className="claimPanel" aria-labelledby="claim-shipping-title">
      <Text
        as="h2"
        textStyle="t6Bold"
        id="claim-shipping-title"
        className="claimPanelTitle"
      >
        주문 배송 정보
      </Text>
      <dl className="claimDetailGrid">
        <ClaimDetailItem
          label="주문상태"
          value={
            <StatusBadge tone={getOrderStatusTone(shipping.orderStatus)}>
              {shipping.orderStatus}
            </StatusBadge>
          }
        />
        <ClaimDetailItem
          label="택배사"
          value={shipping.courierCompany ?? "-"}
        />
        <ClaimDetailItem
          label="송장번호"
          value={
            <span className="claimInlineRow">
              {shipping.trackingNumber ?? "-"}
              {trackingUrl ? (
                <a
                  className="claimTextButton"
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  배송추적
                </a>
              ) : null}
            </span>
          }
        />
        <ClaimDetailItem
          label="발송일"
          value={formatDateTime(shipping.shippedAt)}
        />
      </dl>
    </section>
  );
}
