import { useEffect, useState } from "react";
import { App, Button, Input, Modal, Space, Typography } from "antd";
import type { AdminOrderDetail } from "@/features/orders/types/admin-order";
import { eulo } from "@yeongseon/shared";

const { TextArea } = Input;
const { Text } = Typography;

type ActiveModal = "advance" | "rollback" | "cancel" | null;

interface OrderStatusActionsProps {
  order: AdminOrderDetail;
  nextStatus: string | undefined;
  rollbackStatus: string | undefined;
  onStatusChange: (newStatus: string, memo: string) => Promise<boolean>;
  onRollback: (targetStatus: string, memo: string) => Promise<boolean>;
  onBeforeAdvance?: () => boolean;
  isUpdating: boolean;
}

export function OrderStatusActions({
  order,
  nextStatus,
  rollbackStatus,
  onStatusChange,
  onRollback,
  onBeforeAdvance,
  isUpdating,
}: OrderStatusActionsProps) {
  const { message } = App.useApp();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [memo, setMemo] = useState("");
  const isClaimLocked = order.activeClaim != null;

  const closeModal = () => {
    setActiveModal(null);
    setMemo("");
  };

  const handleAdvanceConfirm = async () => {
    if (isClaimLocked) return;
    if (!nextStatus) return;
    const ok = await onStatusChange(nextStatus, memo);
    if (ok) {
      closeModal();
    }
  };

  const handleCancelConfirm = async () => {
    if (isClaimLocked) return;
    const ok = await onStatusChange("취소", memo);
    if (ok) {
      closeModal();
    }
  };

  const handleRollbackConfirm = async () => {
    if (isClaimLocked) return;
    if (!memo.trim()) {
      message.error("롤백 사유를 입력해주세요.");
      return;
    }
    if (!rollbackStatus) return;
    const ok = await onRollback(rollbackStatus, memo);
    if (ok) {
      closeModal();
    }
  };

  useEffect(() => {
    if (isClaimLocked && activeModal !== null) {
      closeModal();
    }
  }, [activeModal, isClaimLocked]);

  return (
    <>
      <Space direction="vertical" size={8} style={{ marginBottom: 24 }}>
        {isClaimLocked && (
          <Text type="secondary">
            활성 클레임이 있어 주문 상태는 클레임 상세에서 처리해야 합니다.
          </Text>
        )}
        <Space>
          {order.adminActions.includes("advance") && nextStatus && (
            <Button
              type="primary"
              loading={isUpdating}
              disabled={isClaimLocked}
              onClick={() => {
                if (onBeforeAdvance && !onBeforeAdvance()) return;
                setActiveModal("advance");
              }}
            >
              {nextStatus}
              {eulo(nextStatus)} 변경
            </Button>
          )}
          {order.adminActions.includes("rollback") && rollbackStatus && (
            <Button
              loading={isUpdating}
              disabled={isClaimLocked}
              onClick={() => setActiveModal("rollback")}
            >
              {rollbackStatus}
              {eulo(rollbackStatus)} 롤백
            </Button>
          )}
          {order.adminActions.includes("cancel") && (
            <Button
              danger
              loading={isUpdating}
              disabled={isClaimLocked}
              onClick={() => setActiveModal("cancel")}
            >
              취소 처리
            </Button>
          )}
        </Space>
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
            현재 상태 <Text strong>{order.status}</Text> →{" "}
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
        title="주문 취소"
        open={activeModal === "cancel"}
        onOk={handleCancelConfirm}
        onCancel={closeModal}
        okText="취소 처리"
        cancelText="닫기"
        okButtonProps={{ danger: true }}
        confirmLoading={isUpdating}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>이 주문을 취소하시겠습니까?</Text>
          <TextArea
            rows={3}
            placeholder="취소 사유 (선택)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Space>
      </Modal>

      <Modal
        title={`${rollbackStatus}${eulo(rollbackStatus ?? "")} 롤백`}
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
            현재 상태 <Text strong>{order.status}</Text> →{" "}
            <Text strong>{rollbackStatus}</Text>으로 롤백합니다.
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
