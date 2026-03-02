import { Descriptions, Tag } from "antd";
import { ROLE_COLORS } from "../types/admin-customer";
import type { AdminCustomerDetail } from "../types/admin-customer";

interface Props {
  customer: AdminCustomerDetail;
}

export function CustomerProfileSection({ customer }: Props) {
  return (
    <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} style={{ marginBottom: 24 }}>
      <Descriptions.Item label="이름">{customer.name}</Descriptions.Item>
      <Descriptions.Item label="전화번호">
        {customer.phone ?? "-"}
      </Descriptions.Item>
      <Descriptions.Item label="역할">
        <Tag color={ROLE_COLORS[customer.role] ?? "default"}>{customer.role}</Tag>
      </Descriptions.Item>
      <Descriptions.Item label="활성">
        <Tag color={customer.isActive ? "green" : "default"}>
          {customer.isActive ? "활성" : "비활성"}
        </Tag>
      </Descriptions.Item>
      <Descriptions.Item label="가입일">
        {customer.createdAt?.slice(0, 10)}
      </Descriptions.Item>
      <Descriptions.Item label="생년월일">
        {customer.birth ?? "-"}
      </Descriptions.Item>
    </Descriptions>
  );
}
