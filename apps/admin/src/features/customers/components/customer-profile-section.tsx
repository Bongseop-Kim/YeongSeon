import { StatusBadge } from "@/components/StatusBadge";
import type { AdminCustomerDetail } from "@/features/customers/types/admin-customer";
import "./customers.css";

interface Props {
  customer: AdminCustomerDetail;
}

export function CustomerProfileSection({ customer }: Props) {
  return (
    <section className="customerPanel" aria-labelledby="customer-profile-title">
      <h2 id="customer-profile-title" className="customerPanelTitle">
        기본 정보
      </h2>
      <dl className="customerDetailGrid">
        <div className="customerDetailItem">
          <dt className="customerDetailLabel">이름</dt>
          <dd>{customer.name}</dd>
        </div>
        <div className="customerDetailItem">
          <dt className="customerDetailLabel">전화번호</dt>
          <dd>{customer.phone ?? "-"}</dd>
        </div>
        <div className="customerDetailItem">
          <dt className="customerDetailLabel">역할</dt>
          <dd>
            <StatusBadge>{customer.role}</StatusBadge>
          </dd>
        </div>
        <div className="customerDetailItem">
          <dt className="customerDetailLabel">활성</dt>
          <dd>
            <StatusBadge tone={customer.isActive ? "positive" : "neutral"}>
              {customer.isActive ? "활성" : "비활성"}
            </StatusBadge>
          </dd>
        </div>
        <div className="customerDetailItem">
          <dt className="customerDetailLabel">가입일</dt>
          <dd>{customer.createdAt.slice(0, 10)}</dd>
        </div>
        <div className="customerDetailItem">
          <dt className="customerDetailLabel">생년월일</dt>
          <dd>{customer.birth ?? "-"}</dd>
        </div>
      </dl>
    </section>
  );
}
