import { List } from "@refinedev/antd";
import { CustomerListTable } from "@/features/customers";

export default function CustomerList() {
  return (
    <List>
      <CustomerListTable />
    </List>
  );
}
