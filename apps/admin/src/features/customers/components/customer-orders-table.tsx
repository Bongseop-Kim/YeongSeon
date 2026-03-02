import { Table, Tag } from "antd";
import { useNavigation } from "@refinedev/core";
import { ORDER_STATUS_COLORS } from "@yeongseon/shared";
import type { AdminCustomerOrderRow } from "../types/admin-customer";

interface Props {
  orders: AdminCustomerOrderRow[];
}

export function CustomerOrdersTable({ orders }: Props) {
  const { show } = useNavigation();

  return (
    <Table
      dataSource={orders}
      rowKey="id"
      pagination={false}
      size="small"
      style={{ marginBottom: 24 }}
      onRow={(record: AdminCustomerOrderRow) => ({
        onClick: () => show("admin_order_list_view", record.id),
        style: { cursor: "pointer" },
      })}
    >
      <Table.Column dataIndex="orderNumber" title="주문번호" />
      <Table.Column dataIndex="date" title="주문일" />
      <Table.Column
        dataIndex="status"
        title="상태"
        render={(v: string) => <Tag color={ORDER_STATUS_COLORS[v]}>{v}</Tag>}
      />
      <Table.Column
        dataIndex="totalPrice"
        title="결제금액"
        render={(v: number) => `${v?.toLocaleString()}원`}
      />
    </Table>
  );
}
