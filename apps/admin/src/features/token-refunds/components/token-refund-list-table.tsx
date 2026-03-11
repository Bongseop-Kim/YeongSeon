import { useState } from "react";
import { Table, Tag, Button, Space, Modal, Input, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  useTokenRefundRequestsQuery,
  useApproveTokenRefundMutation,
  useRejectTokenRefundMutation,
} from "@/features/token-refunds/api/token-refunds-query";
import type {
  AdminTokenRefundRequest,
  TokenRefundStatus,
} from "@/features/token-refunds/types/admin-token-refund";

const { Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS: Record<TokenRefundStatus, string> = {
  pending:   "orange",
  approved:  "green",
  rejected:  "red",
  cancelled: "default",
};

const STATUS_LABELS: Record<TokenRefundStatus, string> = {
  pending:   "대기중",
  approved:  "승인",
  rejected:  "거절",
  cancelled: "취소됨",
};

interface Props {
  statusFilter?: TokenRefundStatus;
}

export function TokenRefundListTable({ statusFilter }: Props) {
  const [rejectTarget, setRejectTarget] = useState<AdminTokenRefundRequest | null>(null);
  const [rejectMemo, setRejectMemo] = useState("");

  const { data: requests, isLoading, isError } = useTokenRefundRequestsQuery(statusFilter);
  const { mutateAsync: approve, isPending: isApproving } = useApproveTokenRefundMutation();
  const { mutateAsync: reject, isPending: isRejecting } = useRejectTokenRefundMutation();

  const handleApprove = async (record: AdminTokenRefundRequest) => {
    Modal.confirm({
      title: "환불 승인",
      content: `주문번호 ${record.orderNumber}의 환불을 승인하고 Toss 결제 취소를 진행합니다. 계속하시겠습니까?`,
      okText: "승인",
      cancelText: "취소",
      onOk: async () => {
        try {
          await approve(record.id);
          void message.success("환불이 승인되었습니다.");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "승인 처리 중 오류가 발생했습니다.";
          void message.error(msg);
        }
      },
    });
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    try {
      await reject({ requestId: rejectTarget.id, adminMemo: rejectMemo || undefined });
      void message.success("환불 요청이 거절되었습니다.");
      setRejectTarget(null);
      setRejectMemo("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "거절 처리 중 오류가 발생했습니다.";
      void message.error(msg);
    }
  };

  const columns: ColumnsType<AdminTokenRefundRequest> = [
    {
      title: "신청일",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => v?.slice(0, 10) ?? "-",
      width: 110,
    },
    {
      title: "주문번호",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 160,
    },
    {
      title: "유료 토큰",
      dataIndex: "paidTokenAmount",
      key: "paidTokenAmount",
      render: (v: number) => `${v.toLocaleString()}개`,
      width: 100,
    },
    {
      title: "보너스 토큰",
      dataIndex: "bonusTokenAmount",
      key: "bonusTokenAmount",
      render: (v: number) => v > 0 ? `${v.toLocaleString()}개` : "-",
      width: 100,
    },
    {
      title: "환불 금액",
      dataIndex: "refundAmount",
      key: "refundAmount",
      render: (v: number) => `${v.toLocaleString()}원`,
      width: 120,
    },
    {
      title: "상태",
      dataIndex: "status",
      key: "status",
      render: (v: TokenRefundStatus) => (
        <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v]}</Tag>
      ),
      width: 90,
    },
    {
      title: "신청 사유",
      dataIndex: "reason",
      key: "reason",
      render: (v: string | null) => v ?? "-",
      ellipsis: true,
    },
    {
      title: "관리자 메모",
      dataIndex: "adminMemo",
      key: "adminMemo",
      render: (v: string | null) => v ?? "-",
      ellipsis: true,
    },
    {
      title: "처리일",
      dataIndex: "processedAt",
      key: "processedAt",
      render: (v: string | null) => v?.slice(0, 10) ?? "-",
      width: 110,
    },
    {
      title: "작업",
      key: "actions",
      width: 160,
      render: (_, record) => {
        if (record.status !== "pending") return null;
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              loading={isApproving}
              onClick={() => handleApprove(record)}
            >
              승인
            </Button>
            <Button
              danger
              size="small"
              loading={isRejecting}
              onClick={() => {
                setRejectTarget(record);
                setRejectMemo("");
              }}
            >
              거절
            </Button>
          </Space>
        );
      },
    },
  ];

  if (isError) {
    return <Text type="danger">환불 요청 목록을 불러오는 중 오류가 발생했습니다.</Text>;
  }

  return (
    <>
      <Table<AdminTokenRefundRequest>
        dataSource={requests ?? []}
        rowKey="id"
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        size="small"
        scroll={{ x: 1100 }}
      />

      <Modal
        title="환불 거절"
        open={!!rejectTarget}
        onOk={handleRejectConfirm}
        onCancel={() => { setRejectTarget(null); setRejectMemo(""); }}
        okText="거절 확인"
        cancelText="취소"
        confirmLoading={isRejecting}
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginBottom: 12 }}>
          주문번호 <strong>{rejectTarget?.orderNumber}</strong>의 환불 요청을 거절합니다.
        </p>
        <TextArea
          placeholder="거절 사유 (선택)"
          rows={3}
          value={rejectMemo}
          onChange={(e) => setRejectMemo(e.target.value)}
        />
      </Modal>
    </>
  );
}
