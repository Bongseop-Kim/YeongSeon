import { List, useTable } from "@refinedev/antd";
import { Table, Tag, Input, Space } from "antd";
import { useNavigation } from "@refinedev/core";

export default function CustomerList() {
  const { show } = useNavigation();

  const { tableProps, setFilters } = useTable({
    resource: "profiles",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: true,
  });

  return (
    <List>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="이름 검색"
          allowClear
          onSearch={(value) => {
            setFilters([
              { field: "name", operator: "contains", value: value || undefined },
            ]);
          }}
          style={{ width: 250 }}
        />
      </Space>

      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => { if (record.id != null) show("profiles", record.id); },
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="name" title="이름" />
        <Table.Column dataIndex="phone" title="전화번호" />
        <Table.Column
          dataIndex="role"
          title="역할"
          render={(v: string) => (
            <Tag color={v === "admin" ? "red" : v === "manager" ? "orange" : "default"}>
              {v}
            </Tag>
          )}
        />
        <Table.Column
          dataIndex="is_active"
          title="활성"
          render={(v: boolean) => (
            <Tag color={v ? "green" : "default"}>{v ? "활성" : "비활성"}</Tag>
          )}
        />
        <Table.Column
          dataIndex="created_at"
          title="가입일"
          render={(v: string) => v?.slice(0, 10)}
        />
      </Table>
    </List>
  );
}
