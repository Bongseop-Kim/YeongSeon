import { AdminPageHeader } from "@/components/AdminPageHeader";
import { CustomerListTable } from "@/features/customers";

export default function CustomerList() {
  return (
    <main className="customerPage">
      <AdminPageHeader
        title="고객"
        description="가입 고객과 토큰 잔액을 관리합니다."
        className="customerHeader"
        titleClassName="customerTitle"
        descriptionClassName="customerDescription"
      />
      <CustomerListTable />
    </main>
  );
}
