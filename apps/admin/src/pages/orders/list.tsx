import { List, useTable, TagField } from "@refinedev/antd";
import { Table, Input, Select, Space } from "antd";
import { useNavigation } from "@refinedev/core";
import type { AdminOrderListRowDTO } from "@yeongseon/shared";

const STATUS_OPTIONS = [
  { label: "전체", value: "" },
  { label: "대기중", value: "대기중" },
  { label: "진행중", value: "진행중" },
  { label: "배송중", value: "배송중" },
  { label: "완료", value: "완료" },
  { label: "취소", value: "취소" },
];

const STATUS_COLORS: Record<string, string> = {
  대기중: "default",
  진행중: "processing",
  배송중: "blue",
  완료: "success",
  취소: "error",
};

export default function OrderList() {
  const { show } = useNavigation();

  const { tableProps, setFilters } = useTable<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: true,
  });

  return (
    <List>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="주문번호 / 고객명 검색"
          allowClear
          onSearch={(value) => {
            setFilters([
              {
                field: "orderNumber",
                operator: "contains",
                value: value || undefined,
              },
            ]);
          }}
          style={{ width: 250 }}
        />
        <Select
          placeholder="상태"
          allowClear
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setFilters([
              {
                field: "status",
                operator: "eq",
                value: value || undefined,
              },
            ]);
          }}
          style={{ width: 120 }}
        />
      </Space>

      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => show("admin_order_list_view", record.id!),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column
          dataIndex="orderNumber"
          title="주문번호"
        />
        <Table.Column
          dataIndex="date"
          title="주문일"
        />
        <Table.Column
          dataIndex="customerName"
          title="고객명"
        />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(value: string) => (
            <TagField value={value} color={STATUS_COLORS[value]} />
          )}
        />
        <Table.Column
          dataIndex="totalPrice"
          title="결제금액"
          render={(value: number) =>
            `${value?.toLocaleString()}원`
          }
        />
      </Table>
    </List>
  );
}
