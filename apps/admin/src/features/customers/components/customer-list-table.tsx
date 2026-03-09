import { Table, Tag, Input, Space } from "antd";
import { useNavigation } from "@refinedev/core";
import {
  useAdminCustomerTable,
  useCustomerTokenBalancesQuery,
} from "@/features/customers/api/customers-query";
import { ROLE_COLORS } from "../types/admin-customer";
import type { AdminCustomerListItem } from "../types/admin-customer";

export function CustomerListTable() {
  const { show } = useNavigation();
  const { tableProps, setFilters } = useAdminCustomerTable();
  const userIds = (tableProps.dataSource ?? []).map((customer) => customer.id);
  const { data: balances, isLoading: isBalancesLoading } =
    useCustomerTokenBalancesQuery(userIds);
  const tokenBalanceMap = new Map(
    (balances ?? []).map((row) => [row.userId, row.balance])
  );

  return (
    <>
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
        onRow={(record: AdminCustomerListItem) => ({
          onClick: () => show("profiles", record.id),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="name" title="이름" />
        <Table.Column dataIndex="phone" title="전화번호" />
        <Table.Column
          title="토큰 잔액"
          render={(_, record: AdminCustomerListItem) =>
            isBalancesLoading
              ? "-"
              : tokenBalanceMap.get(record.id)?.toLocaleString() ?? "-"
          }
        />
        <Table.Column
          dataIndex="role"
          title="역할"
          render={(v: string) => (
            <Tag color={ROLE_COLORS[v] ?? "default"}>{v}</Tag>
          )}
        />
        <Table.Column
          dataIndex="isActive"
          title="활성"
          render={(v: boolean) => (
            <Tag color={v ? "green" : "default"}>{v ? "활성" : "비활성"}</Tag>
          )}
        />
        <Table.Column
          dataIndex="createdAt"
          title="가입일"
          render={(v: string) => v?.slice(0, 10)}
        />
      </Table>
    </>
  );
}
