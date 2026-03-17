import { useRef } from "react";
import { Button, Space, Typography, Input, Modal, Tag } from "antd";
import { message } from "antd";
import { ADMIN_NON_CANCELABLE_STATUSES } from "@yeongseon/shared";
import type { AdminOrderDetail } from "@/features/orders/types/admin-order";
import { eulo } from "@yeongseon/shared";

const { Text } = Typography;
const { TextArea } = Input;
const NON_CANCELABLE_STATUS_SET: ReadonlySet<string> = new Set(
  ADMIN_NON_CANCELABLE_STATUSES,
);

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
  const rollbackMemoRef = useRef("");

  const handleCancelClick = async () => {
    await onStatusChange("취소", statusMemo);
  };

  const handleRollbackClick = (targetStatus: string) => {
    if (!targetStatus) return;

    rollbackMemoRef.current = "";

    Modal.confirm({
      title: "상태 롤백",
      content: (
        <div>
          <p>
            현재 상태 <Tag>{order.status}</Tag> → <Tag>{targetStatus}</Tag>
            {eulo(targetStatus)} 롤백합니다.
          </p>
          <p style={{ marginBottom: 4 }}>
            <strong>사유 (필수)</strong>
          </p>
          <TextArea
            rows={3}
            placeholder="롤백 사유를 입력하세요"
            onChange={(e) => {
              rollbackMemoRef.current = e.target.value;
            }}
          />
        </div>
      ),
      okText: "롤백",
      cancelText: "취소",
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!rollbackMemoRef.current.trim()) {
          message.error("롤백 사유를 입력해주세요.");
          throw new Error("memo required");
        }
        await onRollback(targetStatus, rollbackMemoRef.current);
      },
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
        {nextStatus && (
          <Button
            type="primary"
            loading={isUpdating}
            onClick={handleNextStatusClick}
          >
            {nextStatus}
            {eulo(nextStatus)} 변경
          </Button>
        )}
        {rollbackStatus && (
          <Button
            loading={isUpdating}
            onClick={() => handleRollbackClick(rollbackStatus)}
          >
            {rollbackStatus}
            {eulo(rollbackStatus)} 롤백
          </Button>
        )}
        {!NON_CANCELABLE_STATUS_SET.has(order.status) && (
          <Button danger loading={isUpdating} onClick={handleCancelClick}>
            취소 처리
          </Button>
        )}
      </Space>
    </>
  );
}
