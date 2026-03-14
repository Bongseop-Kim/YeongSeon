import { Button, Flex, Input, Select } from "antd";
import {
  COURIER_COMPANY_NAMES,
  buildTrackingUrl,
} from "@yeongseon/shared/constants/courier-companies";

interface ClaimTrackingSectionProps {
  claimId: string;
  trackingType: "return" | "resend";
  courierCompany: string;
  trackingNumber: string;
  onCourierChange: (value: string) => void;
  onTrackingNumberChange: (value: string) => void;
  onSave: (
    claimId: string,
    trackingType: "return" | "resend",
    courierCompany: string,
    trackingNumber: string,
  ) => void;
  isPending: boolean;
}

export function ClaimTrackingSection({
  claimId,
  trackingType,
  courierCompany,
  trackingNumber,
  onCourierChange,
  onTrackingNumberChange,
  onSave,
  isPending,
}: ClaimTrackingSectionProps) {
  const trackingUrl =
    courierCompany && trackingNumber
      ? buildTrackingUrl(courierCompany, trackingNumber)
      : null;

  const trackingLabel = trackingType === "return" ? "수거추적" : "배송추적";

  return (
    <Flex wrap="wrap" gap={8} style={{ width: "100%", marginBottom: 24 }}>
      <Select
        value={courierCompany || undefined}
        placeholder="택배사 선택"
        onChange={(value) => onCourierChange(value ?? "")}
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
        onClick={() =>
          onSave(claimId, trackingType, courierCompany, trackingNumber)
        }
        loading={isPending}
      >
        저장
      </Button>
      {trackingUrl && (
        <Button href={trackingUrl} target="_blank" rel="noopener noreferrer">
          {trackingLabel}
        </Button>
      )}
    </Flex>
  );
}
