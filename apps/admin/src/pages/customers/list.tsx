import { List } from "@refinedev/antd";
import { CustomerListTable } from "@/features/customers/components/customer-list-table";

export default function CustomerList() {
  return (
    <List>
      <CustomerListTable />
    </List>
  );
}
