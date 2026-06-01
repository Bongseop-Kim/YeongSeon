import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ORDER_TYPE_LABELS } from "@yeongseon/shared";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type {
  AdminDashboardRecentOrder,
  SegmentValue,
} from "@/features/dashboard/types/admin-dashboard";
import { formatMoney } from "@/utils/format-number";

const SEGMENT_OPTIONS: { label: string; value: SegmentValue }[] = [
  { label: "전체", value: "all" },
  { label: ORDER_TYPE_LABELS.sale, value: "sale" },
  { label: ORDER_TYPE_LABELS.custom, value: "custom" },
  { label: ORDER_TYPE_LABELS.repair, value: "repair" },
  { label: ORDER_TYPE_LABELS.sample, value: "sample" },
  { label: ORDER_TYPE_LABELS.token, value: "token" },
];

function orderStatusTone(status: string) {
  if (status === "배송완료" || status === "확정") return "positive";
  if (status === "취소") return "critical";
  if (status === "결제중") return "warning";
  if (status === "진행중" || status === "배송중") return "brand";
  return "neutral";
}

export function DashboardRecentOrders({
  segment,
  onSegmentChange,
  recentOrders,
}: {
  segment: SegmentValue;
  onSegmentChange: (v: SegmentValue) => void;
  recentOrders: AdminDashboardRecentOrder[];
}) {
  const navigate = useNavigate();
  const columns = useMemo<ColumnDef<AdminDashboardRecentOrder>[]>(
    () => [
      { accessorKey: "orderNumber", header: "주문번호" },
      { accessorKey: "date", header: "주문일" },
      { accessorKey: "customerName", header: "고객명" },
      {
        accessorKey: "orderType",
        header: "유형",
        cell: ({ row }) =>
          ORDER_TYPE_LABELS[row.original.orderType] ?? row.original.orderType,
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <StatusBadge tone={orderStatusTone(row.original.status)}>
            {row.original.status}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "totalPrice",
        header: "결제금액",
        cell: ({ row }) =>
          row.original.totalPrice != null
            ? formatMoney(row.original.totalPrice)
            : "-",
      },
    ],
    [],
  );

  return (
    <section className="dashboardPanel" aria-labelledby="recent-orders-title">
      <div className="dashboardPanelHeader">
        <div>
          <h2 id="recent-orders-title" className="dashboardPanelTitle">
            최근 주문
          </h2>
        </div>
      </div>

      <div className="dashboardSegmentGroup" aria-label="주문 유형 필터">
        {SEGMENT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="dashboardSegmentButton"
            aria-pressed={segment === option.value}
            onClick={() => onSegmentChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <AdminDataTable
        data={recentOrders}
        columns={columns}
        getRowId={(row) => row.id}
        emptyText="최근 주문이 없습니다."
        minWidth={760}
        onRowClick={(row) => navigate(`/orders/show/${row.id}`)}
        getRowActionLabel={(row) => `${row.orderNumber} 주문 상세 보기`}
      />
    </section>
  );
}
