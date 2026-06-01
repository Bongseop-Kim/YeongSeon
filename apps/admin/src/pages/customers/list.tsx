import { CustomerListTable } from "@/features/customers";
import "@/features/customers/components/customers.css";

export default function CustomerList() {
  return (
    <main className="customerPage">
      <header className="customerHeader">
        <h1 className="customerTitle">고객</h1>
        <p className="customerDescription">
          가입 고객과 토큰 잔액을 관리합니다.
        </p>
      </header>
      <CustomerListTable />
    </main>
  );
}
