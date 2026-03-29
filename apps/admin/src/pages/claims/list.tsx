import { List } from "@refinedev/antd";
import { ClaimListTable } from "@/features/claims";

export default function ClaimList() {
  return (
    <List>
      <ClaimListTable />
    </List>
  );
}
