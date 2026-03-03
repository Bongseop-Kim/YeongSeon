import { Table } from "antd";
import { useNavigation } from "@refinedev/core";
import type { AdminOrderItem } from "../types/admin-order";

interface OrderItemsTableProps {
  items: AdminOrderItem[];
}

export function OrderItemsTable({ items }: OrderItemsTableProps) {
  const { edit } = useNavigation();

  return (
    <Table dataSource={items} rowKey="id" pagination={false}>
      <Table.Column
        dataIndex="productName"
        title="상품명"
        render={(_: unknown, record: AdminOrderItem) => {
          if (record.type === "reform") return "리폼 상품";
          if (!record.productName) return "-";
          if (record.productId != null) {
            const { productId } = record;
            return (
              <button
                type="button"
                aria-label={record.productName}
                onClick={(e) => {
                  e.stopPropagation();
                  edit("products", productId);
                }}
                style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
              >
                {record.productName}
              </button>
            );
          }
          return record.productName;
        }}
      />
      <Table.Column dataIndex="quantity" title="수량" />
      <Table.Column
        dataIndex="unitPrice"
        title="단가"
        render={(v: number) => `${v?.toLocaleString()}원`}
      />
      <Table.Column
        dataIndex="discountAmount"
        title="할인"
        render={(v: number) => `${v?.toLocaleString()}원`}
      />
      <Table.Column
        title="소계"
        render={(_: unknown, record: AdminOrderItem) => {
          const subtotal =
            record.unitPrice * record.quantity - record.lineDiscountAmount;
          return `${subtotal.toLocaleString()}원`;
        }}
      />
    </Table>
  );
}
