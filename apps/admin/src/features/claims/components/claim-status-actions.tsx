import { useState } from "react";
import { App, Button, Input, Modal, Space, Typography } from "antd";
import { CLAIM_REJECT_RESTORE_STATUS, eulo } from "@yeongseon/shared";
import type { AdminClaimDetail } from "@/features/claims/types/admin-claim";

const { TextArea } = Input;
const { Text } = Typography;

type ActiveModal = "advance" | "rollback" | "reject" | null;

interface ClaimStatusActionsProps {
  claim: AdminClaimDetail;
  nextStatus: string | undefined;
  rollbackStatus: string | undefined;
  onStatusChange: (newStatus: string, memo: string) => Promise<boolean>;
  onRollback: (targetStatus: string, memo: string) => Promise<void>;
  isUpdating: boolean;
}

export function ClaimStatusActions({
  claim,
  nextStatus,
  rollbackStatus,
  onStatusChange,
  onRollback,
  isUpdating,
}: ClaimStatusActionsProps) {
  const { message } = App.useApp();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [memo, setMemo] = useState("");
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);
  const isRejected = claim.status === "거부";

  const closeModal = () => {
    setActiveModal(null);
    setMemo("");
    setRollbackTarget(null);
  };

  const handleAdvanceConfirm = async () => {
    if (!nextStatus) return;
    const ok = await onStatusChange(nextStatus, memo);
    if (ok) {
      closeModal();
    }
  };

  const handleRejectConfirm = async () => {
    const ok = await onStatusChange("거부", memo);
    if (ok) {
      closeModal();
    }
  };

  const handleRollbackConfirm = async () => {
    if (!memo.trim()) {
      message.error("롤백 사유를 입력해주세요.");
      return;
    }
    if (!rollbackTarget) return;
    await onRollback(rollbackTarget, memo);
    closeModal();
  };

  return (
    <>
      <Space style={{ marginBottom: 24 }}>
        {nextStatus && (
          <Button
            type="primary"
            loading={isUpdating}
            onClick={() => setActiveModal("advance")}
          >
            {nextStatus}
            {eulo(nextStatus)} 변경
          </Button>
        )}
        {rollbackStatus && (
          <Button
            loading={isUpdating}
            onClick={() => {
              setRollbackTarget(rollbackStatus);
              setActiveModal("rollback");
            }}
          >
            {rollbackStatus}
            {eulo(rollbackStatus)} 롤백
          </Button>
        )}
        {isRejected && (
          <Button
            loading={isUpdating}
            onClick={() => {
              setRollbackTarget(CLAIM_REJECT_RESTORE_STATUS);
              setActiveModal("rollback");
            }}
          >
            접수로 복원
          </Button>
        )}
        {claim.status !== "거부" && claim.status !== "완료" && (
          <Button
            danger
            loading={isUpdating}
            onClick={() => setActiveModal("reject")}
          >
            거부
          </Button>
        )}
      </Space>

      <Modal
        title={`${nextStatus}${eulo(nextStatus ?? "")} 변경`}
        open={activeModal === "advance"}
        onOk={handleAdvanceConfirm}
        onCancel={closeModal}
        okText="변경"
        cancelText="닫기"
        confirmLoading={isUpdating}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>
            현재 상태 <Text strong>{claim.status}</Text> →{" "}
            <Text strong>{nextStatus}</Text>으로 변경합니다.
          </Text>
          <TextArea
            rows={3}
            placeholder="메모 (선택)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Space>
      </Modal>

      <Modal
        title="클레임 거부"
        open={activeModal === "reject"}
        onOk={handleRejectConfirm}
        onCancel={closeModal}
        okText="거부"
        cancelText="닫기"
        okButtonProps={{ danger: true }}
        confirmLoading={isUpdating}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>이 클레임을 거부하시겠습니까?</Text>
          <TextArea
            rows={3}
            placeholder="거부 사유 (선택)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Space>
      </Modal>

      <Modal
        title={`${rollbackTarget}${eulo(rollbackTarget ?? "")} 롤백`}
        open={activeModal === "rollback"}
        onOk={handleRollbackConfirm}
        onCancel={closeModal}
        okText="롤백"
        cancelText="닫기"
        okButtonProps={{ danger: true }}
        confirmLoading={isUpdating}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>
            현재 상태 <Text strong>{claim.status}</Text> →{" "}
            <Text strong>{rollbackTarget}</Text>으로 롤백합니다.
          </Text>
          <TextArea
            rows={3}
            placeholder="롤백 사유 (필수)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Space>
      </Modal>
    </>
  );
}
