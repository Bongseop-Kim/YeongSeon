import { Button, Space, Typography, Input, Modal } from "antd";
import type { AdminOrderDetail } from "@/features/orders/types/admin-order";
import { eulo } from "@yeongseon/shared";
import { confirmRollback } from "@/components/confirm-rollback";

const { Text } = Typography;
const { TextArea } = Input;
interface OrderStatusActionsProps {
  order: AdminOrderDetail;
  nextStatus: string | undefined;
  rollbackStatus: string | undefined;
  statusMemo: string;
  onMemoChange: (value: string) => void;
  onStatusChange: (newStatus: string, memo: string) => Promise<void>;
  onRollback: (targetStatus: string, memo: string) => Promise<void>;
  isUpdating: boolean;
}

export function OrderStatusActions({
  order,
  nextStatus,
  rollbackStatus,
  statusMemo,
  onMemoChange,
  onStatusChange,
  onRollback,
  isUpdating,
}: OrderStatusActionsProps) {
  const handleCancelClick = async () => {
    await onStatusChange("취소", statusMemo);
  };

  const handleRollbackClick = (targetStatus: string) => {
    if (!targetStatus) return;

    confirmRollback({
      currentStatus: order.status,
      targetStatus,
      postposition: eulo(targetStatus),
      onRollback,
    });
  };

  const handleNextStatusClick = async () => {
    if (!nextStatus) return;
    if (nextStatus === "취소") {
      Modal.confirm({
        title: "주문 취소",
        content: "정말 이 주문을 취소하시겠습니까?",
        okText: "취소 처리",
        cancelText: "닫기",
        okButtonProps: { danger: true },
        onOk: async () => {
          await onStatusChange(nextStatus, statusMemo);
        },
      });
      return;
    }
    await onStatusChange(nextStatus, statusMemo);
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
        {order.adminActions.includes("advance") && nextStatus && (
          <Button
            type="primary"
            loading={isUpdating}
            onClick={handleNextStatusClick}
          >
            {nextStatus}
            {eulo(nextStatus)} 변경
          </Button>
        )}
        {order.adminActions.includes("rollback") && rollbackStatus && (
          <Button
            loading={isUpdating}
            onClick={() => handleRollbackClick(rollbackStatus)}
          >
            {rollbackStatus}
            {eulo(rollbackStatus)} 롤백
          </Button>
        )}
        {order.adminActions.includes("cancel") && (
          <Button danger loading={isUpdating} onClick={handleCancelClick}>
            취소 처리
          </Button>
        )}
      </Space>
    </>
  );
}
