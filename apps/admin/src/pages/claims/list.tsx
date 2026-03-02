import { List } from "@refinedev/antd";
import { ClaimListTable } from "@/features/claims/components/claim-list-table";

export default function ClaimList() {
  return (
    <List>
      <ClaimListTable />
    </List>
  );
}
