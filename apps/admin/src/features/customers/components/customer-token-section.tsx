import { Text } from "seed-design/ui/text";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { mergeTokenUsageItems, type MergedTokenItem } from "@yeongseon/shared";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  useCustomerTokenBalancesQuery,
  useCustomerTokenHistoryQuery,
} from "@/features/customers/api/customers-query";
import { CustomerTokenFormModal } from "@/features/customers/components/customer-token-form-modal";
import "./customers.css";

interface Props {
  userId: string;
}

const TOKEN_TYPE_LABELS: Record<string, string> = {
  grant: "지급",
  use: "사용",
  refund: "환불",
  admin: "관리자",
};

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

function tokenDescription(record: MergedTokenItem): string {
  if (record.description != null) return record.description;

  switch (record.type) {
    case "admin":
      return "관리자 지급";
    case "grant":
      return `토큰 ${TOKEN_TYPE_LABELS.grant}`;
    case "refund":
      return `토큰 ${TOKEN_TYPE_LABELS.refund}`;
    case "purchase":
      return "토큰 구매";
    default:
      return `토큰 ${TOKEN_TYPE_LABELS.use}`;
  }
}

function formatSignedAmount(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${KR_NUMBER_FORMAT.format(value)}`;
}

function tokenBalanceLabel(params: {
  balance: number;
  isError: boolean;
  isLoading: boolean;
}): string {
  if (params.isLoading) return "잔액 조회 중";
  if (params.isError) return "잔액 조회 오류";
  return `${KR_NUMBER_FORMAT.format(params.balance)} 토큰`;
}

export function CustomerTokenSection({ userId }: Props) {
  const [mode, setMode] = useState<"grant" | "deduct" | null>(null);
  const balancesQuery = useCustomerTokenBalancesQuery([userId]);
  const historyQuery = useCustomerTokenHistoryQuery(userId);
  const currentBalance = balancesQuery.data?.[0]?.balance ?? 0;
  const mergedHistory = useMemo(
    () => mergeTokenUsageItems(historyQuery.data ?? []),
    [historyQuery.data],
  );
  const columns = useMemo<ColumnDef<MergedTokenItem>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "날짜",
        cell: ({ row }) => row.original.createdAt?.slice(0, 10) ?? "-",
      },
      {
        id: "description",
        header: "설명",
        cell: ({ row }) => tokenDescription(row.original),
      },
      {
        accessorKey: "netAmount",
        header: "수량",
        cell: ({ row }) => (
          <Text as="span" textStyle="t4Regular">
            {formatSignedAmount(row.original.netAmount)}
          </Text>
        ),
      },
    ],
    [],
  );

  return (
    <section className="customerPanel" aria-labelledby="customer-token-title">
      <div className="customerTokenHeader">
        <div>
          <Text
            as="h2"
            textStyle="t6Bold"
            id="customer-token-title"
            className="customerPanelTitle"
          >
            토큰
          </Text>
          <StatusBadge tone={balancesQuery.isError ? "critical" : "brand"}>
            {tokenBalanceLabel({
              balance: currentBalance,
              isError: balancesQuery.isError,
              isLoading: balancesQuery.isLoading,
            })}
          </StatusBadge>
        </div>
        <div className="customerTokenActions">
          <ActionButton type="button" onClick={() => setMode("grant")}>
            토큰 지급
          </ActionButton>
          <ActionButton
            type="button"
            variant="criticalSolid"
            onClick={() => setMode("deduct")}
          >
            토큰 차감
          </ActionButton>
        </div>
      </div>

      {historyQuery.isError ? (
        <Callout
          tone="critical"
          description="내역 조회 중 오류가 발생했습니다."
        />
      ) : (
        <>
          {historyQuery.isLoading ? (
            <Text as="p" textStyle="t4Regular" className="customerMutedText">
              토큰 내역을 불러오는 중…
            </Text>
          ) : null}
          <AdminDataTable
            data={mergedHistory}
            columns={columns}
            getRowId={(row) => row.id}
            emptyText="토큰 내역이 없습니다."
          />
        </>
      )}

      {mode ? (
        <CustomerTokenFormModal
          userId={userId}
          mode={mode}
          open={Boolean(mode)}
          onClose={() => setMode(null)}
        />
      ) : null}
    </section>
  );
}
