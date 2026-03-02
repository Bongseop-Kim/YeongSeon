import { Button, Flex, Input, Select, Space, Typography } from "antd";
import { COURIER_COMPANY_NAMES, buildTrackingUrl } from "@yeongseon/shared/constants/courier-companies";

const { Text } = Typography;

interface TrackingSectionProps {
  orderId: string;
  courierCompany: string;
  trackingNumber: string;
  shippedAt: string | null | undefined;
  onCourierChange: (value: string) => void;
  onTrackingNumberChange: (value: string) => void;
  onSave: (orderId: string, courierCompany: string, trackingNumber: string) => void;
  isPending: boolean;
}

export function TrackingSection({
  orderId,
  courierCompany,
  trackingNumber,
  shippedAt,
  onCourierChange,
  onTrackingNumberChange,
  onSave,
  isPending,
}: TrackingSectionProps) {
  const trackingUrl =
    courierCompany && trackingNumber
      ? buildTrackingUrl(courierCompany, trackingNumber)
      : null;

  return (
    <Space direction="vertical" style={{ width: "100%", marginBottom: 24 }}>
      <Flex wrap="wrap" gap={8}>
        <Select
          value={courierCompany || undefined}
          placeholder="택배사 선택"
          onChange={onCourierChange}
          style={{ flex: 1, minWidth: 140 }}
          options={COURIER_COMPANY_NAMES.map((name) => ({
            label: name,
            value: name,
          }))}
          allowClear
        />
        <Input
          value={trackingNumber}
          placeholder="송장번호"
          onChange={(e) => onTrackingNumberChange(e.target.value)}
          style={{ flex: 1, minWidth: 140 }}
        />
        <Button
          type="primary"
          onClick={() => onSave(orderId, courierCompany, trackingNumber)}
          loading={isPending}
        >
          저장
        </Button>
        {trackingUrl && (
          <Button href={trackingUrl} target="_blank" rel="noopener noreferrer">
            배송추적
          </Button>
        )}
      </Flex>
      {shippedAt && (
        <Text type="secondary">
          발송일시: {new Date(shippedAt).toLocaleString("ko-KR")}
        </Text>
      )}
    </Space>
  );
}
