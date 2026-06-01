import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminDataTable } from "@/components/AdminDataTable";
import type { AdminOrderItem } from "@/features/orders/types/admin-order";

interface OrderItemsTableProps {
  items: AdminOrderItem[];
  isLoading?: boolean;
}

function getItemName(record: AdminOrderItem): string {
  if (record.type === "custom") return "주문 제작";
  if (record.type === "sample") return "샘플 제작";
  if (record.type === "reform") return "넥타이 수선";
  if (record.type === "token") {
    const label = record.planKey ?? "토큰";
    return `토큰 구매 (${label}, ${record.tokenAmount ?? "-"}개)`;
  }
  return record.productName ?? "-";
}

function formatPrice(value: number): string {
  return `${value.toLocaleString()}원`;
}

export function OrderItemsTable({
  items,
  isLoading = false,
}: OrderItemsTableProps) {
  const navigate = useNavigate();
  const columns = useMemo<ColumnDef<AdminOrderItem>[]>(
    () => [
      {
        id: "name",
        header: "상품명",
        cell: ({ row }) => {
          const record = row.original;
          const name = getItemName(record);
          if (record.type === "product" && record.productId != null) {
            return (
              <button
                type="button"
                className="orderLinkButton"
                aria-label={name}
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/products/edit/${record.productId}`);
                }}
              >
                {name}
              </button>
            );
          }
          return name;
        },
      },
      { accessorKey: "quantity", header: "수량" },
      {
        accessorKey: "unitPrice",
        header: "단가",
        cell: ({ row }) => formatPrice(row.original.unitPrice),
      },
      {
        accessorKey: "discountAmount",
        header: "할인",
        cell: ({ row }) => formatPrice(row.original.discountAmount),
      },
      {
        id: "subtotal",
        header: "소계",
        cell: ({ row }) => {
          const record = row.original;
          return formatPrice(
            record.unitPrice * record.quantity - record.lineDiscountAmount,
          );
        },
      },
    ],
    [navigate],
  );

  return (
    <AdminDataTable
      data={items}
      columns={columns}
      getRowId={(row) => row.id}
      emptyText="주문 아이템이 없습니다."
      minWidth={720}
      isLoading={isLoading}
    />
  );
}
