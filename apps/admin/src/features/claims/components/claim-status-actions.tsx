import { Button, Modal, Space, message } from "antd";
import { CLAIM_REJECT_RESTORE_STATUS } from "@yeongseon/shared";
import type { AdminClaimDetail } from "@/features/claims/types/admin-claim";
import { confirmRollback } from "@/components/confirm-rollback";
import { StatusMemo } from "@/components/status-memo";

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
    confirmRollback({
      currentStatus: claim.status,
      targetStatus,
      onRollback,
    });
  };

  return (
    <>
      <StatusMemo value={statusMemo} onChange={onMemoChange} />

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
