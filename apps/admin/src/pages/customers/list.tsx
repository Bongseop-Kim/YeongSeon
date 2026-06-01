import { Text } from "seed-design/ui/text";
import { CustomerListTable } from "@/features/customers";
import "@/features/customers/components/customers.css";

export default function CustomerList() {
  return (
    <main className="customerPage">
      <header className="customerHeader">
        <Text as="h1" textStyle="screenTitle" className="customerTitle">
          고객
        </Text>
        <Text as="p" textStyle="t4Regular" className="customerDescription">
          가입 고객과 토큰 잔액을 관리합니다.
        </Text>
      </header>
      <CustomerListTable />
    </main>
  );
}
