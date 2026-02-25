import { List, useTable } from "@refinedev/antd";
import { Table, Tag, Select, Space, Input } from "antd";
import { useNavigation } from "@refinedev/core";
import type { AdminQuoteRequestListRowDTO } from "@yeongseon/shared";
import {
  QUOTE_REQUEST_STATUS_COLORS,
  QUOTE_REQUEST_STATUS_OPTIONS,
  CONTACT_METHOD_LABELS,
} from "@yeongseon/shared";

export default function QuoteRequestList() {
  const { show } = useNavigation();

  const { tableProps, setFilters } = useTable<AdminQuoteRequestListRowDTO>({
    resource: "admin_quote_request_list_view",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: true,
  });

  return (
    <List>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="견적번호 검색"
          allowClear
          onSearch={(value) => {
            setFilters([
              {
                field: "quoteNumber",
                operator: "contains",
                value: value || undefined,
              },
            ]);
          }}
          style={{ width: 200 }}
        />
        <Select
          placeholder="상태"
          allowClear
          options={QUOTE_REQUEST_STATUS_OPTIONS}
          onChange={(value) => {
            setFilters([
              { field: "status", operator: "eq", value: value || undefined },
            ]);
          }}
          style={{ width: 120 }}
        />
      </Space>

      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () =>
            show("admin_quote_request_list_view", record.id!),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="quoteNumber" title="견적번호" />
        <Table.Column dataIndex="date" title="요청일" />
        <Table.Column dataIndex="customerName" title="고객명" />
        <Table.Column dataIndex="contactName" title="담당자" />
        <Table.Column
          dataIndex="contactMethod"
          title="연락방법"
          render={(v: string) =>
            CONTACT_METHOD_LABELS[v as keyof typeof CONTACT_METHOD_LABELS] ?? v
          }
        />
        <Table.Column dataIndex="quantity" title="수량" />
        <Table.Column
          dataIndex="quotedAmount"
          title="견적금액"
          render={(v: number | null) =>
            v != null ? `${v.toLocaleString()}원` : "-"
          }
        />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string) => (
            <Tag color={QUOTE_REQUEST_STATUS_COLORS[v]}>{v}</Tag>
          )}
        />
      </Table>
    </List>
  );
}
