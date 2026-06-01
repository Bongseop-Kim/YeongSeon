import { ActionButton } from "seed-design/ui/action-button";
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
        <label className="orderSelectField">
          <span className="orderFieldLabel">택배사</span>
          <select
            className="orderSelect"
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
          </select>
        </label>
        <label className="orderField">
          <span className="orderFieldLabel">송장번호</span>
          <input
            className="orderInput"
            disabled={isReadOnly}
            value={trackingNumber}
            placeholder="송장번호"
            onChange={(event) => onTrackingNumberChange?.(event.target.value)}
          />
        </label>
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
          <a
            className="orderLinkButton"
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
          >
            배송추적
          </a>
        ) : null}
      </div>
      {shippedAt ? (
        <p className="orderMutedText">
          발송일시: {new Date(shippedAt).toLocaleString("ko-KR")}
        </p>
      ) : null}
    </div>
  );
}
