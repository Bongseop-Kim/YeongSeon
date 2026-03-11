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
};

const { Text } = Typography;

interface MergedTokenRow {
  id: string;
  netAmount: number;
  description: string | null;
  createdAt: string;
  type: string;
}

const extractBaseWorkId = (workId: string | null): string | null => {
  if (!workId) return null;
  return workId.replace(/_use_paid$|_use_bonus$/, "");
};

function mergeUsageItems(items: AdminCustomerTokenRow[]): MergedTokenRow[] {
  const groupMap = new Map<string, { baseItem: AdminCustomerTokenRow; net: number }>();
  const standalone: AdminCustomerTokenRow[] = [];

  for (const item of items) {
    const baseId = extractBaseWorkId(item.workId);

    if ((item.type === "use" || item.type === "refund") && baseId) {
      const entry = groupMap.get(baseId);
      if (entry) {
        entry.net += item.amount;
        if (item.type === "use") entry.baseItem = item;
      } else {
        groupMap.set(baseId, { baseItem: item, net: item.amount });
      }
    } else {
      standalone.push(item);
    }
  }

  return [
    ...Array.from(groupMap.values()).map(({ baseItem, net }) => ({
      id: baseItem.id,
      netAmount: net,
      description: baseItem.description,
      createdAt: baseItem.createdAt,
      type: baseItem.type,
    })),
    ...standalone.map((item) => ({
      id: item.id,
      netAmount: item.amount,
      description: item.description,
      createdAt: item.createdAt,
      type: item.type,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

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
  const mergedHistory = mergeUsageItems(
    (history ?? []),
  );
  const columns = [
    {
      dataIndex: "createdAt",
      title: "날짜",
      render: (value: string) => value?.slice(0, 10) ?? "-",
    },
    {
      dataIndex: "description",
      title: "설명",
      render: (value: string | null, record: MergedTokenRow) =>
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
      )
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
        <Table<MergedTokenRow>
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
