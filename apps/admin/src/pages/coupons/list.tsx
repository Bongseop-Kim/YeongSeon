import { List, useTable } from "@refinedev/antd";
import { Table, Tag } from "antd";
import { useNavigation } from "@refinedev/core";

export default function CouponList() {
  const { edit } = useNavigation();

  const { tableProps } = useTable({
    resource: "coupons",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: true,
  });

  return (
    <List>
      <Table
        {...tableProps}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => { if (record.id != null) edit("coupons", record.id); },
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="name" title="쿠폰명" />
        <Table.Column
          dataIndex="discount_type"
          title="할인유형"
          render={(v: string) => (
            <Tag>{v === "percentage" ? "%" : "원"}</Tag>
          )}
        />
        <Table.Column
          dataIndex="discount_value"
          title="할인값"
          render={(v: number, record: Record<string, unknown>) =>
            record.discount_type === "percentage"
              ? `${v}%`
              : `${v?.toLocaleString()}원`
          }
        />
        <Table.Column dataIndex="expiry_date" title="만료일" />
        <Table.Column
          dataIndex="is_active"
          title="활성"
          render={(v: boolean) => (
            <Tag color={v ? "green" : "default"}>{v ? "활성" : "비활성"}</Tag>
          )}
        />
      </Table>
    </List>
  );
}
