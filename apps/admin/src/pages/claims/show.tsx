import { Show } from "@refinedev/antd";
import { useShow, useUpdate } from "@refinedev/core";
import { Descriptions, Tag, Button, Space, Modal } from "antd";
import type { AdminClaimListRowDTO } from "@yeongseon/shared";

const STATUS_COLORS: Record<string, string> = {
  접수: "default",
  처리중: "processing",
  완료: "success",
  거부: "error",
};

const TYPE_LABELS: Record<string, string> = {
  cancel: "취소",
  return: "반품",
  exchange: "교환",
};

const REASON_LABELS: Record<string, string> = {
  change_mind: "단순변심",
  defect: "불량/파손",
  delay: "배송지연",
  wrong_item: "오배송",
  size_mismatch: "사이즈 불일치",
  color_mismatch: "색상 불일치",
  other: "기타",
};

const STATUS_FLOW: Record<string, string> = {
  접수: "처리중",
  처리중: "완료",
};

export default function ClaimShow() {
  const { query: queryResult } = useShow<AdminClaimListRowDTO>({
    resource: "admin_claim_list_view",
  });
  const claim = queryResult?.data?.data;

  const { mutate: updateClaim, mutation: updateMutation } = useUpdate();

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "거부") {
      Modal.confirm({
        title: "클레임 거부",
        content: "정말 이 클레임을 거부하시겠습니까?",
        okText: "거부",
        cancelText: "닫기",
        okButtonProps: { danger: true },
        onOk: () =>
          updateClaim({
            resource: "claims",
            id: claim!.id,
            values: { status: "거부" },
          }),
      });
      return;
    }

    updateClaim({
      resource: "claims",
      id: claim!.id,
      values: { status: newStatus },
    });
  };

  const nextStatus = claim?.status ? STATUS_FLOW[claim.status] : undefined;

  return (
    <Show>
      <Descriptions bordered column={2}>
        <Descriptions.Item label="클레임번호">
          {claim?.claimNumber}
        </Descriptions.Item>
        <Descriptions.Item label="접수일">{claim?.date}</Descriptions.Item>
        <Descriptions.Item label="유형">
          {claim?.type ? TYPE_LABELS[claim.type] : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="상태">
          {claim?.status && (
            <Tag color={STATUS_COLORS[claim.status]}>{claim.status}</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="고객명">
          {claim?.customerName}
        </Descriptions.Item>
        <Descriptions.Item label="연락처">
          {claim?.customerPhone ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="주문번호">
          {claim?.orderNumber}
        </Descriptions.Item>
        <Descriptions.Item label="상품명">
          {claim?.productName ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="사유">
          {claim?.reason ? REASON_LABELS[claim.reason] ?? claim.reason : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="수량">
          {claim?.claimQuantity}
        </Descriptions.Item>
        <Descriptions.Item label="상세설명" span={2}>
          {claim?.description ?? "-"}
        </Descriptions.Item>
      </Descriptions>

      <Space style={{ marginTop: 16 }}>
        {nextStatus && (
          <Button
            type="primary"
            loading={updateMutation.isPending}
            onClick={() => handleStatusChange(nextStatus)}
          >
            {nextStatus} 으로 변경
          </Button>
        )}
        {claim?.status !== "거부" && claim?.status !== "완료" && (
          <Button
            danger
            loading={updateMutation.isPending}
            onClick={() => handleStatusChange("거부")}
          >
            거부
          </Button>
        )}
      </Space>
    </Show>
  );
}
