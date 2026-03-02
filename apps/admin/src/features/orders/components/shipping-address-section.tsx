import { Descriptions } from "antd";
import type { AdminShippingAddress } from "../types/admin-order";

interface ShippingAddressSectionProps {
  address: AdminShippingAddress | null;
}

export function ShippingAddressSection({ address }: ShippingAddressSectionProps) {
  return (
    <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} style={{ marginBottom: 24 }}>
      <Descriptions.Item label="수령인">{address?.recipientName ?? "-"}</Descriptions.Item>
      <Descriptions.Item label="연락처">{address?.recipientPhone ?? "-"}</Descriptions.Item>
      <Descriptions.Item label="우편번호">{address?.postalCode ?? "-"}</Descriptions.Item>
      <Descriptions.Item label="주소" span={2}>
        {address?.address ?? "-"}
        {address?.addressDetail && ` ${address.addressDetail}`}
      </Descriptions.Item>
      <Descriptions.Item label="배송메모">{address?.deliveryMemo ?? "-"}</Descriptions.Item>
      <Descriptions.Item label="배송요청사항">{address?.deliveryRequest ?? "-"}</Descriptions.Item>
    </Descriptions>
  );
}
