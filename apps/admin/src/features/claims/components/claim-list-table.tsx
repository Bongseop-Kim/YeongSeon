import { Table, Tag, Select, Space } from "antd";
import { useNavigation } from "@refinedev/core";
import {
  CLAIM_STATUS_COLORS,
  CLAIM_STATUS_OPTIONS,
  CLAIM_TYPE_LABELS,
} from "@yeongseon/shared";
import { useAdminClaimTable } from "@/features/claims/api/claims-query";
import type { AdminClaimListItem } from "@/features/claims/types/admin-claim";
import { formatDateTime } from "@/utils/format-date-time";

export function ClaimListTable() {
  const { show } = useNavigation();
  const { tableProps, setFilters } = useAdminClaimTable();

  return (
    <>
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
        onRow={(record: AdminClaimListItem) => ({
          onClick: () => show("admin_claim_list_view", record.id),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="claimNumber" title="클레임번호" />
        <Table.Column
          dataIndex="claimType"
          title="유형"
          render={(v: string) =>
            CLAIM_TYPE_LABELS[v as keyof typeof CLAIM_TYPE_LABELS] ?? v
          }
        />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string) => <Tag color={CLAIM_STATUS_COLORS[v]}>{v}</Tag>}
        />
        <Table.Column dataIndex="orderNumber" title="주문번호" />
        <Table.Column dataIndex="customerName" title="고객명" />
        <Table.Column dataIndex="productName" title="상품명" />
        <Table.Column
          dataIndex="createdAt"
          title="접수일"
          render={formatDateTime}
        />
      </Table>
    </>
  );
}
