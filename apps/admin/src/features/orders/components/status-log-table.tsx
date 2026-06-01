import type { ColumnDef } from "@tanstack/react-table";
import { CLAIM_TYPE_LABELS } from "@yeongseon/shared";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { AdminOrderHistoryEntry } from "@/features/orders/types/admin-order";
import { OrderStatusBadge } from "./order-status-badge";

interface StatusLogTableProps {
  logs: AdminOrderHistoryEntry[];
}

function renderDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ko-KR");
}

const columns: ColumnDef<AdminOrderHistoryEntry>[] = [
  {
    accessorKey: "createdAt",
    header: "일시",
    cell: ({ row }) => renderDate(row.original.createdAt),
  },
  {
    accessorKey: "kind",
    header: "이력 종류",
    cell: ({ row }) => (
      <StatusBadge tone={row.original.kind === "claim" ? "warning" : "brand"}>
        {row.original.kind === "claim" ? "클레임" : "주문"}
      </StatusBadge>
    ),
  },
  {
    id: "claimInfo",
    header: "클레임 정보",
    cell: ({ row }) =>
      row.original.kind === "claim" ? (
        <span>
          <StatusBadge>{CLAIM_TYPE_LABELS[row.original.claimType]}</StatusBadge>{" "}
          {row.original.claimNumber}
        </span>
      ) : (
        "-"
      ),
  },
  {
    accessorKey: "previousStatus",
    header: "이전 상태",
    cell: ({ row }) => (
      <OrderStatusBadge>{row.original.previousStatus}</OrderStatusBadge>
    ),
  },
  {
    accessorKey: "newStatus",
    header: "변경 상태",
    cell: ({ row }) => (
      <OrderStatusBadge>{row.original.newStatus}</OrderStatusBadge>
    ),
  },
  {
    accessorKey: "changedBy",
    header: "변경자",
    cell: ({ row }) => row.original.changedBy ?? "-",
  },
  {
    accessorKey: "memo",
    header: "메모",
    cell: ({ row }) => row.original.memo ?? "-",
  },
  {
    accessorKey: "isRollback",
    header: "구분",
    cell: ({ row }) => (
      <StatusBadge tone={row.original.isRollback ? "critical" : "neutral"}>
        {row.original.isRollback ? "롤백" : "정상"}
      </StatusBadge>
    ),
  },
];

export function StatusLogTable({ logs }: StatusLogTableProps) {
  return (
    <AdminDataTable
      data={logs}
      columns={columns}
      getRowId={(row) => `${row.kind}:${row.id}`}
      emptyText="상태 변경 이력이 없습니다."
      minWidth={960}
    />
  );
}
