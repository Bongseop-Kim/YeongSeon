import { List, useTable } from "@refinedev/antd";
import { Table, Tag, Select, Space } from "antd";
import { useNavigation } from "@refinedev/core";
import type { AdminClaimListRowDTO } from "@yeongseon/shared";

const STATUS_COLORS: Record<string, string> = {
  접수: "default",
  처리중: "processing",
  완료: "success",
  거부: "error",
};

const TYPE_LABELS: Record<string, string> = {
  cancel: "취소",
  return: "반품",
  exchange: "교환",
};

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
          options={[
            { label: "접수", value: "접수" },
            { label: "처리중", value: "처리중" },
            { label: "완료", value: "완료" },
            { label: "거부", value: "거부" },
          ]}
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
          options={[
            { label: "취소", value: "cancel" },
            { label: "반품", value: "return" },
            { label: "교환", value: "exchange" },
          ]}
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
          onClick: () => show("admin_claim_list_view", record.id!),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="claimNumber" title="클레임번호" />
        <Table.Column
          dataIndex="type"
          title="유형"
          render={(v: string) => TYPE_LABELS[v] ?? v}
        />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string) => <Tag color={STATUS_COLORS[v]}>{v}</Tag>}
        />
        <Table.Column dataIndex="orderNumber" title="주문번호" />
        <Table.Column dataIndex="customerName" title="고객명" />
        <Table.Column dataIndex="productName" title="상품명" />
        <Table.Column dataIndex="date" title="접수일" />
      </Table>
    </List>
  );
}
