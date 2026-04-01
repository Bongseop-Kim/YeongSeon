import { Button, Descriptions, Tag } from "antd";
import { useNavigation } from "@refinedev/core";
import { CLAIM_STATUS_COLORS, CLAIM_TYPE_LABELS } from "@yeongseon/shared";
import type { AdminActiveClaimSummary } from "@/features/orders/types/admin-order";

interface ActiveClaimSectionProps {
  claim: AdminActiveClaimSummary;
}

export function ActiveClaimSection({ claim }: ActiveClaimSectionProps) {
  const { show } = useNavigation();

  return (
    <section style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          gap: 12,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600 }}>활성 클레임</span>
        <Button onClick={() => show("admin_claim_list_view", claim.id)}>
          클레임 상세 바로가기
        </Button>
      </div>

      <Descriptions bordered column={{ xs: 1, sm: 2, md: 2 }}>
        <Descriptions.Item label="클레임번호">
          {claim.claimNumber}
        </Descriptions.Item>
        <Descriptions.Item label="유형">
          {CLAIM_TYPE_LABELS[claim.type]}
        </Descriptions.Item>
        <Descriptions.Item label="상태">
          <Tag color={CLAIM_STATUS_COLORS[claim.status]}>{claim.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="요청 수량">
          {claim.quantity}
        </Descriptions.Item>
      </Descriptions>
    </section>
  );
}
