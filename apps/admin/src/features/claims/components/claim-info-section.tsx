import { Descriptions, Tag } from "antd";
import { useNavigation } from "@refinedev/core";
import {
  CLAIM_STATUS_COLORS,
  CLAIM_TYPE_LABELS,
  CLAIM_REASON_LABELS,
} from "@yeongseon/shared";
import type { AdminClaimDetail } from "../types/admin-claim";

interface ClaimInfoSectionProps {
  claim: AdminClaimDetail;
}

export function ClaimInfoSection({ claim }: ClaimInfoSectionProps) {
  const { show } = useNavigation();

  return (
    <Descriptions
      bordered
      column={{ xs: 1, sm: 1, md: 2 }}
      style={{ marginBottom: 24 }}
    >
      <Descriptions.Item label="클레임번호">
        {claim.claimNumber}
      </Descriptions.Item>
      <Descriptions.Item label="접수일">{claim.date}</Descriptions.Item>
      <Descriptions.Item label="유형">
        {CLAIM_TYPE_LABELS[claim.claimType]}
      </Descriptions.Item>
      <Descriptions.Item label="상태">
        <Tag color={CLAIM_STATUS_COLORS[claim.status]}>{claim.status}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="고객명">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            show("profiles", claim.customer.userId);
          }}
          style={{
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: 0,
          }}
        >
          {claim.customer.name}
        </button>
      </Descriptions.Item>
      <Descriptions.Item label="연락처">
        {claim.customer.phone ?? "-"}
      </Descriptions.Item>
      <Descriptions.Item label="주문번호">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            show("admin_order_list_view", claim.linkedOrder.orderId);
          }}
          style={{
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: 0,
          }}
        >
          {claim.linkedOrder.orderNumber}
        </button>
      </Descriptions.Item>
      <Descriptions.Item label="상품명">
        {claim.productName ?? "-"}
      </Descriptions.Item>
      <Descriptions.Item label="사유">
        {CLAIM_REASON_LABELS[claim.reason] ?? claim.reason}
      </Descriptions.Item>
      <Descriptions.Item label="수량">{claim.claimQuantity}</Descriptions.Item>
      <Descriptions.Item label="상세설명" span={2}>
        {claim.description ?? "-"}
      </Descriptions.Item>
    </Descriptions>
  );
}
