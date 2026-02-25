import { Show } from "@refinedev/antd";
import { useShow, useList, useNavigation } from "@refinedev/core";
import { Descriptions, Tag, Table, Typography } from "antd";
import type { AdminOrderListRowDTO } from "@yeongseon/shared";

const { Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  대기중: "default",
  진행중: "processing",
  배송중: "blue",
  완료: "success",
  취소: "error",
};

export default function CustomerShow() {
  const { show, edit } = useNavigation();
  const { query: queryResult } = useShow({ resource: "profiles" });
  const profile = queryResult?.data?.data;

  const { result: ordersResult } = useList<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    filters: [{ field: "userId", operator: "eq", value: profile?.id }],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { pageSize: 10 },
    queryOptions: { enabled: !!profile?.id },
  });

  const { result: couponsResult } = useList({
    resource: "user_coupons",
    filters: [{ field: "user_id", operator: "eq", value: profile?.id }],
    queryOptions: { enabled: !!profile?.id },
  });

  return (
    <Show>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="이름">
          {profile?.name as string}
        </Descriptions.Item>
        <Descriptions.Item label="전화번호">
          {(profile?.phone as string) ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="역할">
          <Tag>{profile?.role as string}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="활성">
          <Tag color={profile?.is_active ? "green" : "default"}>
            {profile?.is_active ? "활성" : "비활성"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="가입일">
          {(profile?.created_at as string)?.slice(0, 10)}
        </Descriptions.Item>
        <Descriptions.Item label="생년월일">
          {(profile?.birth as string) ?? "-"}
        </Descriptions.Item>
      </Descriptions>

      <Title level={5}>최근 주문</Title>
      <Table
        dataSource={ordersResult.data}
        rowKey="id"
        pagination={false}
        size="small"
        style={{ marginBottom: 24 }}
        onRow={(record) => ({
          onClick: () => show("admin_order_list_view", record.id),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="orderNumber" title="주문번호" />
        <Table.Column dataIndex="date" title="주문일" />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string) => <Tag color={STATUS_COLORS[v]}>{v}</Tag>}
        />
        <Table.Column
          dataIndex="totalPrice"
          title="결제금액"
          render={(v: number) => `${v?.toLocaleString()}원`}
        />
      </Table>

      <Title level={5}>보유 쿠폰</Title>
      <Table
        dataSource={couponsResult.data}
        rowKey="id"
        pagination={false}
        size="small"
        onRow={(record) => ({
          onClick: () => edit("coupons", record.coupon_id),
          style: { cursor: "pointer" },
        })}
      >
        <Table.Column dataIndex="coupon_id" title="쿠폰 ID" />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string) => <Tag>{v}</Tag>}
        />
        <Table.Column
          dataIndex="issued_at"
          title="발급일"
          render={(v: string) => v?.slice(0, 10)}
        />
        <Table.Column
          dataIndex="expires_at"
          title="만료일"
          render={(v: string | null) => v?.slice(0, 10) ?? "-"}
        />
      </Table>
    </Show>
  );
}
