import { List, useTable } from "@refinedev/antd";
import { Table, Tag, Select, Space } from "antd";
import { useNavigation } from "@refinedev/core";
import type { AdminClaimListRowDTO } from "@yeongseon/shared";
import {
  CLAIM_STATUS_COLORS,
  CLAIM_STATUS_OPTIONS,
  CLAIM_TYPE_LABELS,
} from "@yeongseon/shared";

export default function ClaimList() {
  const { show } = useNavigation();

  const { tableProps, setFilters } = useTable<AdminClaimListRowDTO>({
    resource: "admin_claim_list_view",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: true,
  });

  return (
    <List>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="상태"
          allowClear
          options={CLAIM_STATUS_OPTIONS}
          onChange={(value) => {
            setFilters([
              { field: "status", operator: "eq", value: value || undefined },
            ]);
          }}
          style={{ width: 120 }}
        />
        <Select
          placeholder="유형"
          allowClear
          options={Object.entries(CLAIM_TYPE_LABELS).map(([value, label]) => ({
            label,
            value,
          }))}
          onChange={(value) => {
            setFilters([
              { field: "type", operator: "eq", value: value || undefined },
            ]);
          }}
          style={{ width: 120 }}
        />
      </Space>

      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => show("admin_claim_list_view", record.id),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="claimNumber" title="클레임번호" />
        <Table.Column
          dataIndex="type"
          title="유형"
          render={(v: string) => CLAIM_TYPE_LABELS[v as keyof typeof CLAIM_TYPE_LABELS] ?? v}
        />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string) => <Tag color={CLAIM_STATUS_COLORS[v]}>{v}</Tag>}
        />
        <Table.Column dataIndex="orderNumber" title="주문번호" />
        <Table.Column dataIndex="customerName" title="고객명" />
        <Table.Column dataIndex="productName" title="상품명" />
        <Table.Column dataIndex="date" title="접수일" />
      </Table>
    </List>
  );
}
