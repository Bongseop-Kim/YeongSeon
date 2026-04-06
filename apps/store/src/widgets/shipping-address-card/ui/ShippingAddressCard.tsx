import { Button } from "@/shared/ui/button";
import { formatPhoneNumber } from "@/shared/lib/phone-format";
import { getDeliveryRequestLabel } from "@/shared/constants/DELIVERY_REQUEST_OPTIONS";

export interface ShippingCardAddress {
  recipientName: string;
  recipientPhone: string;
  address: string;
  detailAddress?: string | null;
  postalCode: string;
  deliveryRequest?: string | null;
  deliveryMemo?: string | null;
}

interface ShippingAddressCardProps {
  address: ShippingCardAddress | null;
  editable?: boolean;
  onChangeClick?: () => void;
}

export function ShippingAddressCard({
  address,
  editable = false,
  onChangeClick,
}: ShippingAddressCardProps) {
  const addressLine = address
    ? [address.address, address.detailAddress, `(${address.postalCode})`]
        .filter(Boolean)
        .join(" ")
    : null;

  const deliveryLabel = address?.deliveryRequest
    ? getDeliveryRequestLabel(address.deliveryRequest, address.deliveryMemo)
    : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold text-zinc-950">
          {address?.recipientName ?? "배송지 정보 없음"}
        </p>
        {editable && (
          <Button variant="outline" size="sm" onClick={onChangeClick}>
            배송지 변경
          </Button>
        )}
      </div>
      {address ? (
        <div className="space-y-1 text-sm text-zinc-700">
          <p>{addressLine}</p>
          <p>{formatPhoneNumber(address.recipientPhone)}</p>
          {deliveryLabel && <p className="text-zinc-500">{deliveryLabel}</p>}
        </div>
      ) : (
        <p className="pb-4 text-sm text-zinc-500">배송지를 추가해주세요.</p>
      )}
    </div>
  );
}
