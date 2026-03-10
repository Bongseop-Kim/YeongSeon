import { useState } from "react";
import { Button, Space, Table, Tag, Typography } from "antd";
import { useCustomerTokenBalancesQuery, useCustomerTokenHistoryQuery } from "@/features/customers/api/customers-query";
import { CustomerTokenFormModal } from "@/features/customers/components/customer-token-form-modal";
import type { AdminCustomerTokenRow } from "@/features/customers/types/admin-customer";

interface Props {
  userId: string;
}

const TOKEN_TYPE_LABELS: Record<string, string> = {
  grant: "지급",
  use: "사용",
  refund: "환불",
  admin: "관리자",
  purchase: "구매",
};

const { Text } = Typography;

export function CustomerTokenSection({ userId }: Props) {
  const [mode, setMode] = useState<"grant" | "deduct" | null>(null);
  const {
    data: balances,
    isLoading: isBalancesLoading,
    isError: isBalancesError,
  } =
    useCustomerTokenBalancesQuery([userId]);
  const {
    data: history,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } =
    useCustomerTokenHistoryQuery(userId);

  const currentBalance = balances?.[0]?.balance ?? 0;
  const columns = [
    {
      dataIndex: "createdAt",
      title: "날짜",
      render: (value: string) => value?.slice(0, 10) ?? "-",
    },
    {
      dataIndex: "type",
      title: "유형",
      render: (value: string) => TOKEN_TYPE_LABELS[value] ?? value ?? "-",
    },
    {
      dataIndex: "amount",
      title: "수량",
      render: (value: number) => (
        <Text type={value > 0 ? "success" : "danger"}>
          {value > 0 ? "+" : ""}
          {value.toLocaleString()}
        </Text>
      ),
    },
    {
      dataIndex: "aiModel",
      title: "AI모델",
      render: (value: string | null) => value ?? "-",
    },
    {
      dataIndex: "description",
      title: "설명",
      render: (value: string | null) => value ?? "-",
    },
  ];

  return (
    <>
      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Space>
          <Text strong>현재 잔액</Text>
          <Tag color="blue">
            {isBalancesLoading
              ? "-"
              : isBalancesError
                ? "잔액 조회 오류"
                : `${currentBalance.toLocaleString()} 토큰`}
          </Tag>
        </Space>
        <Space>
          <Button type="primary" onClick={() => setMode("grant")}>
            토큰 지급
          </Button>
          <Button danger onClick={() => setMode("deduct")}>
            토큰 차감
          </Button>
        </Space>
      </Space>

      {isHistoryError ? (
        <Text type="danger" style={{ marginBottom: 24, display: "block" }}>
          내역 조회 중 오류가 발생했습니다.
        </Text>
      ) : (
        <Table<AdminCustomerTokenRow>
          dataSource={history ?? []}
          rowKey="id"
          loading={isHistoryLoading}
          pagination={false}
          size="small"
          style={{ marginBottom: 24 }}
          columns={columns}
        />
      )}

      {mode && (
        <CustomerTokenFormModal
          userId={userId}
          mode={mode}
          open={!!mode}
          onClose={() => setMode(null)}
        />
      )}
    </>
  );
}
