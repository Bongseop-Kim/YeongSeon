import { Descriptions, Tag, Button, Space } from "antd";
import { ORDER_STATUS_COLORS, buildTrackingUrl } from "@yeongseon/shared";
import type { AdminClaimOrderShipping } from "../types/admin-claim";

interface OrderShippingSectionProps {
  shipping: AdminClaimOrderShipping;
}

export function OrderShippingSection({ shipping }: OrderShippingSectionProps) {
  const trackingUrl =
    shipping.courierCompany && shipping.trackingNumber
      ? buildTrackingUrl(shipping.courierCompany, shipping.trackingNumber)
      : null;

  return (
    <Descriptions
      bordered
      column={{ xs: 1, sm: 1, md: 2 }}
      style={{ marginBottom: 24 }}
    >
      <Descriptions.Item label="주문상태">
        <Tag color={ORDER_STATUS_COLORS[shipping.orderStatus]}>
          {shipping.orderStatus}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="택배사">
        {shipping.courierCompany ?? "-"}
      </Descriptions.Item>
      <Descriptions.Item label="송장번호">
        <Space>
          {shipping.trackingNumber ?? "-"}
          {trackingUrl && (
            <Button
              size="small"
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              배송추적
            </Button>
          )}
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label="발송일">
        {(() => {
          if (!shipping.shippedAt) return "-";
          const d = new Date(shipping.shippedAt);
          return isNaN(d.getTime()) ? "-" : d.toLocaleString("ko-KR");
        })()}
      </Descriptions.Item>
    </Descriptions>
  );
}
