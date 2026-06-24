import { Text } from "seed-design/ui/text";
import { AdminDetailItem, AdminDetailList } from "@/components/AdminDetailList";
import { StatusBadge } from "@/components/StatusBadge";
import type { AdminCustomerDetail } from "@/features/customers/types/admin-customer";
import "./customers.css";

interface Props {
  customer: AdminCustomerDetail;
}

export function CustomerProfileSection({ customer }: Props) {
  return (
    <section className="customerPanel" aria-labelledby="customer-profile-title">
      <div className="customerPanelHeader">
        <Text
          as="h2"
          textStyle="t6Bold"
          id="customer-profile-title"
          className="customerPanelTitle"
        >
          기본 정보
        </Text>
      </div>
      <AdminDetailList>
        <AdminDetailItem label="이름">{customer.name}</AdminDetailItem>
        <AdminDetailItem label="전화번호">
          {customer.phone ?? "-"}
        </AdminDetailItem>
        <AdminDetailItem label="이메일">
          {customer.email ?? "-"}
        </AdminDetailItem>
        <AdminDetailItem label="역할">
          <StatusBadge>{customer.role}</StatusBadge>
        </AdminDetailItem>
        <AdminDetailItem label="활성">
          <StatusBadge tone={customer.isActive ? "positive" : "neutral"}>
            {customer.isActive ? "활성" : "비활성"}
          </StatusBadge>
        </AdminDetailItem>
        <AdminDetailItem label="가입일">
          {customer.createdAt.slice(0, 10)}
        </AdminDetailItem>
        <AdminDetailItem label="생년월일">
          {customer.birth ?? "-"}
        </AdminDetailItem>
      </AdminDetailList>
    </section>
  );
}
