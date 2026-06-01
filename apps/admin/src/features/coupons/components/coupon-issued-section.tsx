import { Text } from "seed-design/ui/text";
import { useMemo } from "react";
import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ActionButton } from "seed-design/ui/action-button";
import { isActiveIssuedStatus } from "@/features/coupons/api/coupons-api";
import type { IssuedCouponRow } from "@/features/coupons/types/admin-coupon";
import { AdminDataTable } from "./admin-data-table";
import { CouponTextBadge } from "./coupon-status-badge";

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

function formatIssuedStatus(status: string | null): string {
  return status?.trim() || "-";
}

interface CouponIssuedSectionProps {
  issuedRows: IssuedCouponRow[];
  selectedIssuedIds: Set<string>;
  selectedIssuedRows: IssuedCouponRow[];
  isFetching: boolean;
  isRevoking: boolean;
  onSelectedIssuedIdsChange: (ids: Set<string>) => void;
  onOpenIssueDialog: () => void;
  onRevoke: (rows: IssuedCouponRow[]) => void;
}

export function CouponIssuedSection({
  issuedRows,
  selectedIssuedIds,
  selectedIssuedRows,
  isFetching,
  isRevoking,
  onSelectedIssuedIdsChange,
  onOpenIssueDialog,
  onRevoke,
}: CouponIssuedSectionProps): ReactNode {
  const issuedColumns = useMemo<ColumnDef<IssuedCouponRow>[]>(
    () => [
      {
        accessorKey: "userName",
        header: "이름",
        cell: ({ row }) => row.original.userName ?? "-",
      },
      {
        accessorKey: "userEmail",
        header: "이메일",
        cell: ({ row }) => row.original.userEmail ?? "-",
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <CouponTextBadge>
            {formatIssuedStatus(row.original.status)}
          </CouponTextBadge>
        ),
      },
      {
        accessorKey: "issuedAt",
        header: "발급일",
        cell: ({ row }) => row.original.issuedAt ?? "-",
      },
      {
        id: "revoke",
        header: "회수",
        cell: ({ row }) => (
          <ActionButton
            type="button"
            size="small"
            variant="criticalSolid"
            disabled={!isActiveIssuedStatus(row.original.status) || isRevoking}
            loading={isRevoking}
            onClick={() => onRevoke([row.original])}
          >
            회수
          </ActionButton>
        ),
      },
    ],
    [isRevoking, onRevoke],
  );

  return (
    <section className="couponPanel" aria-labelledby="coupon-issued-title">
      <div className="couponPanelHeader">
        <Text
          as="h2"
          textStyle="t6Bold"
          id="coupon-issued-title"
          className="couponPanelTitle"
        >
          발급 내역 ({KR_NUMBER_FORMAT.format(issuedRows.length)}건)
        </Text>
        <div className="couponInlineActions">
          <ActionButton type="button" onClick={onOpenIssueDialog}>
            쿠폰 발급
          </ActionButton>
          <ActionButton
            type="button"
            variant="criticalSolid"
            disabled={selectedIssuedRows.length === 0 || isRevoking}
            loading={isRevoking}
            onClick={() => onRevoke(selectedIssuedRows)}
          >
            일괄 회수 ({selectedIssuedRows.length}건)
          </ActionButton>
        </div>
      </div>

      {isFetching ? (
        <Text as="p" textStyle="t4Regular" aria-live="polite">
          발급 내역을 불러오는 중…
        </Text>
      ) : null}
      <AdminDataTable
        data={issuedRows}
        columns={issuedColumns}
        getRowId={(row) => row.id}
        emptyText="발급 내역이 없습니다."
        selectedRowIds={selectedIssuedIds}
        onSelectedRowIdsChange={onSelectedIssuedIdsChange}
        isRowSelectable={(row) => isActiveIssuedStatus(row.status)}
      />
    </section>
  );
}
