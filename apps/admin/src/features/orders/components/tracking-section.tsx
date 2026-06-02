import { Text } from "seed-design/ui/text";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { AdminSelectField } from "@/components/AdminSelectField";
import {
  COURIER_COMPANY_NAMES,
  buildTrackingUrl,
} from "@yeongseon/shared/constants/courier-companies";

interface TrackingSectionProps {
  orderId: string;
  courierCompany: string;
  trackingNumber: string;
  shippedAt: string | null | undefined;
  onCourierChange?: (value: string) => void;
  onTrackingNumberChange?: (value: string) => void;
  onSave?: (
    orderId: string,
    courierCompany: string,
    trackingNumber: string,
  ) => void;
  isPending?: boolean;
  isReadOnly?: boolean;
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
  isReadOnly = false,
}: TrackingSectionProps) {
  const trackingUrl =
    courierCompany && trackingNumber
      ? buildTrackingUrl(courierCompany, trackingNumber)
      : null;

  return (
    <div className="orderTrackingSection">
      <div className="orderTrackingControls">
        <AdminSelectField
          className="orderField"
          label="택배사"
          name="courierCompany"
          disabled={isReadOnly}
          value={courierCompany}
          onChange={(event) => onCourierChange?.(event.target.value)}
        >
          <option value="">택배사 선택</option>
          {COURIER_COMPANY_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </AdminSelectField>
        <TextField
          className="orderField"
          label="송장번호"
          disabled={isReadOnly}
          value={trackingNumber}
          onValueChange={({ value }) => onTrackingNumberChange?.(value)}
        >
          <TextFieldInput
            name="trackingNumber"
            disabled={isReadOnly}
            placeholder="송장번호"
          />
        </TextField>
        {!isReadOnly ? (
          <ActionButton
            type="button"
            loading={isPending}
            disabled={isPending}
            onClick={() => onSave?.(orderId, courierCompany, trackingNumber)}
          >
            저장
          </ActionButton>
        ) : null}
        {trackingUrl ? (
          <ActionButton asChild variant="neutralWeak">
            <a href={trackingUrl} target="_blank" rel="noreferrer">
              배송추적
            </a>
          </ActionButton>
        ) : null}
      </div>
      {shippedAt ? (
        <Text as="p" textStyle="t4Regular" className="orderMutedText">
          발송일시: {new Date(shippedAt).toLocaleString("ko-KR")}
        </Text>
      ) : null}
    </div>
  );
}
