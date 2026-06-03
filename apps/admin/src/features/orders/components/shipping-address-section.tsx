import { getDeliveryRequestLabel } from "@yeongseon/shared";
import type { AdminShippingAddress } from "@/features/orders/types/admin-order";
import { OrderDetailGrid, OrderDetailItem } from "./order-detail-grid";

interface ShippingAddressSectionProps {
  address: AdminShippingAddress | null;
}

function formatAddress(address: AdminShippingAddress | null): string {
  if (!address?.address) return "-";
  return `${address.address}${address.addressDetail ? ` ${address.addressDetail}` : ""}`;
}

function formatDeliveryRequest(address: AdminShippingAddress | null): string {
  if (!address?.deliveryRequest) return "-";
  return (
    getDeliveryRequestLabel(address.deliveryRequest, address.deliveryMemo) ??
    address.deliveryRequest
  );
}

export function ShippingAddressSection({
  address,
}: ShippingAddressSectionProps) {
  return (
    <OrderDetailGrid>
      <OrderDetailItem label="수령인">
        {address?.recipientName ?? "-"}
      </OrderDetailItem>
      <OrderDetailItem label="연락처">
        {address?.recipientPhone ?? "-"}
      </OrderDetailItem>
      <OrderDetailItem label="우편번호">
        {address?.postalCode ?? "-"}
      </OrderDetailItem>
      <OrderDetailItem label="주소" full>
        {formatAddress(address)}
      </OrderDetailItem>
      <OrderDetailItem label="배송메모">
        {address?.deliveryMemo ?? "-"}
      </OrderDetailItem>
      <OrderDetailItem label="배송요청사항">
        {formatDeliveryRequest(address)}
      </OrderDetailItem>
    </OrderDetailGrid>
  );
}
