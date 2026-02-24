import { Show } from "@refinedev/antd";
import { useShow, useList, useUpdate, useOne } from "@refinedev/core";
import {
  Descriptions,
  Tag,
  Table,
  Button,
  Space,
  Modal,
  Typography,
  Input,
  Select,
  message,
} from "antd";
import { useState, useEffect } from "react";
import type {
  AdminOrderDetailRowDTO,
  AdminOrderItemRowDTO,
  AdminSettingRowDTO,
} from "@yeongseon/shared";
import {
  COURIER_COMPANY_NAMES,
  buildTrackingUrl,
} from "@yeongseon/shared/constants/courier-companies";

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
  const { query: queryResult } = useShow<AdminOrderDetailRowDTO>({
    resource: "admin_order_detail_view",
  });
  const order = queryResult?.data?.data;

  const { result: itemsResult } = useList<AdminOrderItemRowDTO>({
    resource: "admin_order_item_view",
    filters: [{ field: "orderId", operator: "eq", value: order?.id }],
    queryOptions: { enabled: !!order?.id },
  });

  const { data: defaultCourierSetting } = useOne<AdminSettingRowDTO>({
    resource: "admin_settings",
    id: "default_courier_company",
    meta: { idColumnName: "key" },
    queryOptions: { enabled: true },
  });

  const { mutate: updateOrder, mutation: updateMutation } = useUpdate();

  const [courierCompany, setCourierCompany] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");

  useEffect(() => {
    if (order) {
      if (courierCompany === "") {
        setCourierCompany(
          order.courierCompany ??
            defaultCourierSetting?.data?.value ??
            ""
        );
      }
      if (trackingNumber === "") {
        setTrackingNumber(order.trackingNumber ?? "");
      }
    }
  }, [order, defaultCourierSetting, courierCompany, trackingNumber]);

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

    const values: Record<string, unknown> = { status: newStatus };
    if (newStatus === "배송중") {
      values.shipped_at = new Date().toISOString();
    }

    updateOrder({
      resource: "orders",
      id: order!.id,
      values,
    });
  };

  const handleSaveTracking = () => {
    if (!order) return;
    updateOrder(
      {
        resource: "orders",
        id: order.id,
        values: {
          courier_company: courierCompany || null,
          tracking_number: trackingNumber || null,
        },
      },
      {
        onSuccess: () => {
          message.success("배송 정보가 저장되었습니다.");
        },
      },
    );
  };

  const nextStatus = order?.status ? STATUS_FLOW[order.status] : undefined;
  const trackingUrl =
    courierCompany && trackingNumber
      ? buildTrackingUrl(courierCompany, trackingNumber)
      : null;

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
        <Descriptions.Item label="이메일">
          {order?.customerEmail ?? "-"}
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

      <Title level={5}>배송지 정보</Title>
      <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="수령인">
          {order?.recipientName ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="연락처">
          {order?.recipientPhone ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="우편번호">
          {order?.shippingPostalCode ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="주소" span={2}>
          {order?.shippingAddress ?? "-"}
          {order?.shippingAddressDetail && ` ${order.shippingAddressDetail}`}
        </Descriptions.Item>
        <Descriptions.Item label="배송메모">
          {order?.deliveryMemo ?? "-"}
        </Descriptions.Item>
        <Descriptions.Item label="배송요청사항">
          {order?.deliveryRequest ?? "-"}
        </Descriptions.Item>
      </Descriptions>

      <Title level={5}>배송 정보</Title>
      <Space direction="vertical" style={{ width: "100%", marginBottom: 24 }}>
        <Space wrap>
          <Select
            value={courierCompany || undefined}
            placeholder="택배사 선택"
            onChange={setCourierCompany}
            style={{ width: 180 }}
            options={COURIER_COMPANY_NAMES.map((name) => ({
              label: name,
              value: name,
            }))}
            allowClear
          />
          <Input
            value={trackingNumber}
            placeholder="송장번호"
            onChange={(e) => setTrackingNumber(e.target.value)}
            style={{ width: 220 }}
          />
          <Button
            type="primary"
            onClick={handleSaveTracking}
            loading={updateMutation.isPending}
          >
            저장
          </Button>
          {trackingUrl && (
            <Button
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              배송추적
            </Button>
          )}
        </Space>
        {order?.shippedAt && (
          <Typography.Text type="secondary">
            발송일시: {new Date(order.shippedAt).toLocaleString("ko-KR")}
          </Typography.Text>
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
