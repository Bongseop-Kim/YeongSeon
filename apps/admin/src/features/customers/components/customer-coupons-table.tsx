import { Table, Tag } from "antd";
import { useNavigation } from "@refinedev/core";
import type { AdminCustomerCouponRow } from "@/features/customers/types/admin-customer";

interface Props {
  coupons: AdminCustomerCouponRow[];
}

export function CustomerCouponsTable({ coupons }: Props) {
  const { edit } = useNavigation();

  return (
    <Table
      dataSource={coupons}
      rowKey="id"
      pagination={false}
      size="small"
      onRow={(record: AdminCustomerCouponRow) => ({
        onClick: record.couponId
          ? () => edit("coupons", record.couponId)
          : undefined,
        style: { cursor: record.couponId ? "pointer" : "default" },
      })}
    >
      <Table.Column dataIndex="couponId" title="쿠폰 ID" />
      <Table.Column
        dataIndex="status"
        title="상태"
        render={(v: string) => <Tag>{v}</Tag>}
      />
      <Table.Column
        dataIndex="issuedAt"
        title="발급일"
        render={(v: string) => v?.slice(0, 10)}
      />
      <Table.Column
        dataIndex="expiresAt"
        title="만료일"
        render={(v: string | null) => v?.slice(0, 10) ?? "-"}
      />
    </Table>
  );
}
