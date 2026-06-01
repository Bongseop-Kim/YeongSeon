import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { getClaimStatusTone } from "@/features/claims/components/claim-status-tone";
import type { AdminClaimStatusLogEntry } from "@/features/claims/types/admin-claim";
import { formatDateTime } from "@/utils/format-date-time";

interface ClaimStatusLogTableProps {
  logs: AdminClaimStatusLogEntry[];
}

export function ClaimStatusLogTable({ logs }: ClaimStatusLogTableProps) {
  const columns = useMemo<ColumnDef<AdminClaimStatusLogEntry>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "일시",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: "previousStatus",
        header: "이전 상태",
        cell: ({ row }) => (
          <StatusBadge tone={getClaimStatusTone(row.original.previousStatus)}>
            {row.original.previousStatus}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "newStatus",
        header: "변경 상태",
        cell: ({ row }) => (
          <StatusBadge tone={getClaimStatusTone(row.original.newStatus)}>
            {row.original.newStatus}
          </StatusBadge>
        ),
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
    ],
    [],
  );

  return (
    <AdminDataTable
      data={logs}
      columns={columns}
      getRowId={(row) => row.id}
      emptyText="상태 변경 이력이 없습니다."
      minWidth={640}
    />
  );
}
