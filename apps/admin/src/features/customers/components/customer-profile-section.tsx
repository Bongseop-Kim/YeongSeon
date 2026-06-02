import { Text } from "seed-design/ui/text";
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
      <dl className="customerDetailGrid">
        <div className="customerDetailItem">
          <Text as="dt" textStyle="t4Medium" className="customerDetailLabel">
            이름
          </Text>
          <Text as="dd" textStyle="t4Regular" className="customerDetailValue">
            {customer.name}
          </Text>
        </div>
        <div className="customerDetailItem">
          <Text as="dt" textStyle="t4Medium" className="customerDetailLabel">
            전화번호
          </Text>
          <Text as="dd" textStyle="t4Regular" className="customerDetailValue">
            {customer.phone ?? "-"}
          </Text>
        </div>
        <div className="customerDetailItem">
          <Text as="dt" textStyle="t4Medium" className="customerDetailLabel">
            역할
          </Text>
          <Text as="dd" textStyle="t4Regular" className="customerDetailValue">
            <StatusBadge>{customer.role}</StatusBadge>
          </Text>
        </div>
        <div className="customerDetailItem">
          <Text as="dt" textStyle="t4Medium" className="customerDetailLabel">
            활성
          </Text>
          <Text as="dd" textStyle="t4Regular" className="customerDetailValue">
            <StatusBadge tone={customer.isActive ? "positive" : "neutral"}>
              {customer.isActive ? "활성" : "비활성"}
            </StatusBadge>
          </Text>
        </div>
        <div className="customerDetailItem">
          <Text as="dt" textStyle="t4Medium" className="customerDetailLabel">
            가입일
          </Text>
          <Text as="dd" textStyle="t4Regular" className="customerDetailValue">
            {customer.createdAt.slice(0, 10)}
          </Text>
        </div>
        <div className="customerDetailItem">
          <Text as="dt" textStyle="t4Medium" className="customerDetailLabel">
            생년월일
          </Text>
          <Text as="dd" textStyle="t4Regular" className="customerDetailValue">
            {customer.birth ?? "-"}
          </Text>
        </div>
      </dl>
    </section>
  );
}
