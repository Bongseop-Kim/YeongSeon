import { Text } from "seed-design/ui/text";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ORDER_TYPE_LABELS } from "@yeongseon/shared";
import { Callout } from "seed-design/ui/callout";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useRelatedOrders } from "@/features/orders/api/orders-query";
import type { AdminOrderListItem } from "@/features/orders/types/admin-order";
import { OrderStatusBadge } from "./order-status-badge";

interface RelatedOrdersSectionProps {
  paymentGroupId: string | null;
  currentOrderId: string;
}

export function RelatedOrdersSection({
  paymentGroupId,
  currentOrderId,
}: RelatedOrdersSectionProps) {
  const { relatedOrders, isLoading, error } = useRelatedOrders(
    paymentGroupId,
    currentOrderId,
  );
  const columns = useMemo<ColumnDef<AdminOrderListItem>[]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: "주문번호",
        cell: ({ row }) => (
          <Link to={`/orders/show/${row.original.id}`}>
            {row.original.orderNumber}
          </Link>
        ),
      },
      {
        accessorKey: "orderType",
        header: "유형",
        cell: ({ row }) => (
          <StatusBadge>{ORDER_TYPE_LABELS[row.original.orderType]}</StatusBadge>
        ),
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <OrderStatusBadge>{row.original.status}</OrderStatusBadge>
        ),
      },
      {
        accessorKey: "totalPrice",
        header: "금액",
        cell: ({ row }) => `${row.original.totalPrice.toLocaleString()}원`,
      },
    ],
    [],
  );

  if (!isLoading && (!paymentGroupId || relatedOrders.length === 0)) {
    return (
      <Text as="p" textStyle="t4Regular" className="orderMutedText">
        함께 결제된 주문이 없습니다.
      </Text>
    );
  }

  return (
    <>
      {isLoading ? (
        <Text as="p" textStyle="t4Regular" className="orderMutedText">
          불러오는 중…
        </Text>
      ) : null}
      {error ? <Callout tone="critical" description={error.message} /> : null}
      <AdminDataTable
        data={relatedOrders}
        columns={columns}
        getRowId={(row) => row.id}
        emptyText="함께 결제된 주문이 없습니다."
        minWidth={720}
      />
    </>
  );
}
