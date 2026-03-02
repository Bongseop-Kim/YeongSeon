import { Button, Space, Typography, Input, Modal, Tag } from "antd";
import { message } from "antd";
import { CLAIM_REJECT_RESTORE_STATUS } from "@yeongseon/shared";
import type { AdminClaimDetail } from "../types/admin-claim";

const { Text } = Typography;
const { TextArea } = Input;

interface ClaimStatusActionsProps {
  claim: AdminClaimDetail;
  nextStatus: string | undefined;
  rollbackStatus: string | undefined;
  statusMemo: string;
  onMemoChange: (value: string) => void;
  onStatusChange: (newStatus: string, memo: string) => Promise<void>;
  onRollback: (targetStatus: string, memo: string) => Promise<void>;
  isUpdating: boolean;
}

export function ClaimStatusActions({
  claim,
  nextStatus,
  rollbackStatus,
  statusMemo,
  onMemoChange,
  onStatusChange,
  onRollback,
  isUpdating,
}: ClaimStatusActionsProps) {
  const isRejected = claim.status === "거부";

  const handleNextStatusClick = async () => {
    if (!nextStatus) return;
    try {
      await onStatusChange(nextStatus, statusMemo);
    } catch {
      message.error("상태 변경에 실패했습니다.");
    }
  };

  const handleRejectClick = () => {
    Modal.confirm({
      title: "클레임 거부",
      content: "정말 이 클레임을 거부하시겠습니까?",
      okText: "거부",
      cancelText: "닫기",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await onStatusChange("거부", statusMemo);
        } catch {
          message.error("거부 처리에 실패했습니다.");
        }
      },
    });
  };

  const handleRollbackClick = (targetStatus: string) => {
    let rollbackMemoValue = "";

    Modal.confirm({
      title: "상태 롤백",
      content: (
        <div>
          <p>
            현재 상태 <Tag>{claim.status}</Tag> → <Tag>{targetStatus}</Tag>(으)로 롤백합니다.
          </p>
          <p style={{ marginBottom: 4 }}><strong>사유 (필수)</strong></p>
          <TextArea
            rows={3}
            placeholder="롤백 사유를 입력하세요"
            onChange={(e) => {
              rollbackMemoValue = e.target.value;
            }}
          />
        </div>
      ),
      okText: "롤백",
      cancelText: "취소",
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!rollbackMemoValue.trim()) {
          message.error("롤백 사유를 입력해주세요.");
          throw new Error("memo required");
        }
        try {
          await onRollback(targetStatus, rollbackMemoValue);
        } catch {
          message.error("롤백 처리에 실패했습니다.");
        }
      },
    });
  };

  return (
    <>
      <Space direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
        <div>
          <Text strong>상태 변경 메모</Text>
          <TextArea
            value={statusMemo}
            onChange={(e) => onMemoChange(e.target.value)}
            rows={2}
            placeholder="상태 변경 사유 (이력에 기록됨)"
            style={{ marginTop: 4 }}
          />
        </div>
      </Space>

      <Space style={{ marginBottom: 24 }}>
        {nextStatus && (
          <Button
            type="primary"
            loading={isUpdating}
            onClick={handleNextStatusClick}
          >
            {nextStatus} 으로 변경
          </Button>
        )}
        {rollbackStatus && (
          <Button
            loading={isUpdating}
            onClick={() => handleRollbackClick(rollbackStatus)}
          >
            {rollbackStatus} 으로 롤백
          </Button>
        )}
        {isRejected && (
          <Button
            loading={isUpdating}
            onClick={() => handleRollbackClick(CLAIM_REJECT_RESTORE_STATUS)}
          >
            접수로 복원
          </Button>
        )}
        {claim.status !== "거부" && claim.status !== "완료" && (
          <Button danger loading={isUpdating} onClick={handleRejectClick}>
            거부
          </Button>
        )}
      </Space>
    </>
  );
}
