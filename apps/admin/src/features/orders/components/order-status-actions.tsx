import { useState } from "react";
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
  onStatusChange: (newStatus: string, memo: string) => Promise<void>;
  onRollback: (targetStatus: string, memo: string) => Promise<void>;
  isUpdating: boolean;
}

export function OrderStatusActions({
  order,
  nextStatus,
  rollbackStatus,
  onStatusChange,
  onRollback,
  isUpdating,
}: OrderStatusActionsProps) {
  const { message } = App.useApp();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [memo, setMemo] = useState("");

  const closeModal = () => {
    setActiveModal(null);
    setMemo("");
  };

  const handleAdvanceConfirm = async () => {
    if (!nextStatus) return;
    await onStatusChange(nextStatus, memo);
    closeModal();
  };

  const handleCancelConfirm = async () => {
    await onStatusChange("취소", memo);
    closeModal();
  };

  const handleRollbackConfirm = async () => {
    if (!memo.trim()) {
      message.error("롤백 사유를 입력해주세요.");
      return;
    }
    if (!rollbackStatus) return;
    await onRollback(rollbackStatus, memo);
    closeModal();
  };

  return (
    <>
      <Space style={{ marginBottom: 24 }}>
        {order.adminActions.includes("advance") && nextStatus && (
          <Button
            type="primary"
            loading={isUpdating}
            onClick={() => setActiveModal("advance")}
          >
            {nextStatus}
            {eulo(nextStatus)} 변경
          </Button>
        )}
        {order.adminActions.includes("rollback") && rollbackStatus && (
          <Button
            loading={isUpdating}
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
            onClick={() => setActiveModal("cancel")}
          >
            취소 처리
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
