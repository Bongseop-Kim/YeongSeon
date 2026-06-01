import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ORDER_STATUS_COLORS } from "@yeongseon/shared";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { AdminCustomerOrderRow } from "@/features/customers/types/admin-customer";
import "./customers.css";

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

function orderTone(status: string) {
  return ORDER_STATUS_COLORS[status] === "green" ? "positive" : "neutral";
}

interface Props {
  orders: AdminCustomerOrderRow[];
  isLoading?: boolean;
}

export function CustomerOrdersTable({ orders, isLoading = false }: Props) {
  const navigate = useNavigate();
  const columns = useMemo<ColumnDef<AdminCustomerOrderRow>[]>(
    () => [
      { accessorKey: "orderNumber", header: "주문번호" },
      { accessorKey: "date", header: "주문일" },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <StatusBadge tone={orderTone(row.original.status)}>
            {row.original.status}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "totalPrice",
        header: "결제금액",
        cell: ({ row }) =>
          `${KR_NUMBER_FORMAT.format(row.original.totalPrice)}원`,
      },
    ],
    [],
  );

  return (
    <AdminDataTable
      data={orders}
      columns={columns}
      getRowId={(row) => row.id}
      emptyText="주문 내역이 없습니다."
      onRowClick={(row) => navigate(`/orders/show/${row.id}`)}
      getRowActionLabel={(row) => `${row.orderNumber} 주문 상세 보기`}
      isLoading={isLoading}
    />
  );
}
