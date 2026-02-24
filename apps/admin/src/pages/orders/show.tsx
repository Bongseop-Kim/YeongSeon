import { Show } from "@refinedev/antd";
import { useShow, useList, useUpdate } from "@refinedev/core";
import {
  Descriptions,
  Tag,
  Table,
  Button,
  Space,
  Modal,
  Typography,
} from "antd";
import type {
  AdminOrderListRowDTO,
  AdminOrderItemRowDTO,
} from "@yeongseon/shared";

const { Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  대기중: "default",
  진행중: "processing",
  배송중: "blue",
  완료: "success",
  취소: "error",
};

const STATUS_FLOW: Record<string, string> = {
  대기중: "진행중",
  진행중: "배송중",
  배송중: "완료",
};

export default function OrderShow() {
  const { query: queryResult } = useShow<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
  });
  const order = queryResult?.data?.data;

  const { result: itemsResult } = useList<AdminOrderItemRowDTO>({
    resource: "admin_order_item_view",
    filters: [{ field: "orderId", operator: "eq", value: order?.id }],
    queryOptions: { enabled: !!order?.id },
  });

  const { mutate: updateOrder, mutation: updateMutation } = useUpdate();

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "취소") {
      Modal.confirm({
        title: "주문 취소",
        content: "정말 이 주문을 취소하시겠습니까?",
        okText: "취소 처리",
        cancelText: "닫기",
        okButtonProps: { danger: true },
        onOk: () =>
          updateOrder({
            resource: "orders",
            id: order!.id,
            values: { status: "취소" },
          }),
      });
      return;
    }

    updateOrder({
      resource: "orders",
      id: order!.id,
      values: { status: newStatus },
    });
  };

  const nextStatus = order?.status ? STATUS_FLOW[order.status] : undefined;

  return (
    <Show>
      <Title level={5}>주문 정보</Title>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="주문번호">
          {order?.orderNumber}
        </Descriptions.Item>
        <Descriptions.Item label="주문일">{order?.date}</Descriptions.Item>
        <Descriptions.Item label="고객명">
          {order?.customerName}
        </Descriptions.Item>
        <Descriptions.Item label="연락처">
          {order?.customerPhone ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="상태">
          {order?.status && (
            <Tag color={STATUS_COLORS[order.status]}>{order.status}</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="원가">
          {order?.originalPrice?.toLocaleString()}원
        </Descriptions.Item>
        <Descriptions.Item label="할인">
          {order?.totalDiscount?.toLocaleString()}원
        </Descriptions.Item>
        <Descriptions.Item label="결제금액">
          <strong>{order?.totalPrice?.toLocaleString()}원</strong>
        </Descriptions.Item>
      </Descriptions>

      <Space style={{ marginBottom: 16 }}>
        {nextStatus && (
          <Button
            type="primary"
            loading={updateMutation.isPending}
            onClick={() => handleStatusChange(nextStatus)}
          >
            {nextStatus} 으로 변경
          </Button>
        )}
        {order?.status !== "취소" && order?.status !== "완료" && (
          <Button
            danger
            loading={updateMutation.isPending}
            onClick={() => handleStatusChange("취소")}
          >
            취소 처리
          </Button>
        )}
      </Space>

      <Title level={5}>주문 아이템</Title>
      <Table
        dataSource={itemsResult.data}
        rowKey="id"
        pagination={false}
      >
        <Table.Column
          dataIndex="productName"
          title="상품명"
          render={(value: string | null, record: AdminOrderItemRowDTO) =>
            record.itemType === "reform" ? "리폼 상품" : (value ?? "-")
          }
        />
        <Table.Column dataIndex="quantity" title="수량" />
        <Table.Column
          dataIndex="unitPrice"
          title="단가"
          render={(v: number) => `${v?.toLocaleString()}원`}
        />
        <Table.Column
          dataIndex="discountAmount"
          title="할인"
          render={(v: number) => `${v?.toLocaleString()}원`}
        />
        <Table.Column
          title="소계"
          render={(_: unknown, record: AdminOrderItemRowDTO) => {
            const subtotal =
              record.unitPrice * record.quantity - record.lineDiscountAmount;
            return `${subtotal.toLocaleString()}원`;
          }}
        />
      </Table>
    </Show>
  );
}
