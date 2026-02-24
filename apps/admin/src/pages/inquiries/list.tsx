import { List, useTable } from "@refinedev/antd";
import { Table, Tag, Select, Space } from "antd";
import { useNavigation } from "@refinedev/core";

const STATUS_COLORS: Record<string, string> = {
  답변대기: "warning",
  답변완료: "success",
};

export default function InquiryList() {
  const { show } = useNavigation();

  const { tableProps, setFilters } = useTable({
    resource: "inquiries",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: true,
  });

  return (
    <List>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="상태"
          allowClear
          options={[
            { label: "답변대기", value: "답변대기" },
            { label: "답변완료", value: "답변완료" },
          ]}
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
          onClick: () => show("inquiries", record.id!),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="title" title="제목" />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string) => <Tag color={STATUS_COLORS[v]}>{v}</Tag>}
        />
        <Table.Column
          dataIndex="created_at"
          title="작성일"
          render={(v: string) => v?.slice(0, 10)}
        />
      </Table>
    </List>
  );
}
