import { useState } from "react";
import { Button, Space, Table, Tag, Typography } from "antd";
import {
  useCustomerTokenBalancesQuery,
  useCustomerTokenHistoryQuery,
} from "@/features/customers/api/customers-query";
import { CustomerTokenFormModal } from "@/features/customers/components/customer-token-form-modal";
import { mergeTokenUsageItems, type MergedTokenItem } from "@yeongseon/shared";

interface Props {
  userId: string;
}

const TOKEN_TYPE_LABELS: Record<string, string> = {
  grant: "지급",
  use: "사용",
  refund: "환불",
  admin: "관리자",
};

const { Text } = Typography;

export function CustomerTokenSection({ userId }: Props) {
  const [mode, setMode] = useState<"grant" | "deduct" | null>(null);
  const {
    data: balances,
    isLoading: isBalancesLoading,
    isError: isBalancesError,
  } = useCustomerTokenBalancesQuery([userId]);
  const {
    data: history,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } = useCustomerTokenHistoryQuery(userId);

  const currentBalance = balances?.[0]?.balance ?? 0;
  const mergedHistory = mergeTokenUsageItems(history ?? []);
  const columns = [
    {
      dataIndex: "createdAt",
      title: "날짜",
      render: (value: string) => value?.slice(0, 10) ?? "-",
    },
    {
      dataIndex: "description",
      title: "설명",
      render: (value: string | null, record: MergedTokenItem) =>
        value ??
        (record.type === "admin"
          ? "관리자 지급"
          : record.type === "grant"
            ? `토큰 ${TOKEN_TYPE_LABELS.grant}`
            : record.type === "refund"
              ? `토큰 ${TOKEN_TYPE_LABELS.refund}`
              : record.type === "purchase"
                ? "토큰 구매"
                : `토큰 ${TOKEN_TYPE_LABELS.use}`),
    },
    {
      dataIndex: "netAmount",
      title: "수량",
      render: (value: number) => (
        <Text type={value > 0 ? "success" : value < 0 ? "danger" : "secondary"}>
          {value > 0 ? "+" : ""}
          {value.toLocaleString()}
        </Text>
      ),
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
        <Table<MergedTokenItem>
          dataSource={mergedHistory}
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
