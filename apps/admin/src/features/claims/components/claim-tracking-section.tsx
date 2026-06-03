import { Text } from "seed-design/ui/text";
import {
  COURIER_COMPANY_NAMES,
  buildTrackingUrl,
} from "@yeongseon/shared/constants/courier-companies";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { AdminSelectField } from "@/components/AdminSelectField";
import "./claims.css";

const COURIER_OPTIONS = COURIER_COMPANY_NAMES.map((name) => ({
  label: name,
  value: name,
}));

const TRACKING_TITLE = {
  return: "수거 정보",
  resend: "재발송 정보",
} as const;

const TRACKING_LABEL = {
  return: "수거추적",
  resend: "배송추적",
} as const;

interface ClaimTrackingSectionProps {
  trackingType: "return" | "resend";
  courierCompany: string;
  trackingNumber: string;
  onCourierChange: (value: string) => void;
  onTrackingNumberChange: (value: string) => void;
  onSave: () => void;
  isPending: boolean;
}

export function ClaimTrackingSection({
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

  return (
    <section
      className="claimPanel"
      aria-labelledby={`${trackingType}-tracking-title`}
    >
      <Text
        as="h2"
        textStyle="t6Bold"
        id={`${trackingType}-tracking-title`}
        className="claimPanelTitle"
      >
        {TRACKING_TITLE[trackingType]}
      </Text>
      <div className="claimTrackingForm">
        <AdminSelectField
          className="claimTrackingField"
          label="택배사"
          name={`${trackingType}-courier-company`}
          value={courierCompany}
          onChange={(event) => onCourierChange(event.target.value)}
        >
          <option value="">택배사 선택</option>
          {COURIER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminSelectField>
        <TextField
          className="claimTrackingField"
          label="송장번호"
          value={trackingNumber}
          onValueChange={({ value }) => onTrackingNumberChange(value)}
        >
          <TextFieldInput
            name={`${trackingType}-tracking-number`}
            placeholder="송장번호"
          />
        </TextField>
        <ActionButton type="button" loading={isPending} onClick={onSave}>
          저장
        </ActionButton>
        {trackingUrl ? (
          <ActionButton asChild variant="neutralWeak">
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
              {TRACKING_LABEL[trackingType]}
            </a>
          </ActionButton>
        ) : null}
      </div>
    </section>
  );
}
