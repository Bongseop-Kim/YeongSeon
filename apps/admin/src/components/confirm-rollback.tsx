import { Input, Modal, Tag, message } from "antd";

const { TextArea } = Input;

interface ConfirmRollbackOptions {
  currentStatus: string;
  targetStatus: string;
  postposition?: string;
  onRollback: (targetStatus: string, memo: string) => Promise<void>;
}

export function confirmRollback({
  currentStatus,
  targetStatus,
  postposition = "(으)로",
  onRollback,
}: ConfirmRollbackOptions): void {
  let memoValue = "";

  Modal.confirm({
    title: "상태 롤백",
    content: (
      <div>
        <p>
          현재 상태 <Tag>{currentStatus}</Tag> → <Tag>{targetStatus}</Tag>
          {postposition} 롤백합니다.
        </p>
        <p style={{ marginBottom: 4 }}>
          <strong>사유 (필수)</strong>
        </p>
        <TextArea
          rows={3}
          placeholder="롤백 사유를 입력하세요"
          onChange={(e) => {
            memoValue = e.target.value;
          }}
        />
      </div>
    ),
    okText: "롤백",
    cancelText: "취소",
    okButtonProps: { danger: true },
    onOk: async () => {
      if (!memoValue.trim()) {
        message.error("롤백 사유를 입력해주세요.");
        throw new Error("memo required");
      }

      try {
        await onRollback(targetStatus, memoValue);
      } catch (error) {
        if (error instanceof Error && error.message === "memo required") {
          throw error;
        }
        message.error("롤백 처리에 실패했습니다.");
        throw error;
      }
    },
  });
}
