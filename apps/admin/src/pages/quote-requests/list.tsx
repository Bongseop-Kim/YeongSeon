import { List } from "@refinedev/antd";
import { QuoteRequestListTable } from "@/features/quote-requests";

export default function QuoteRequestList() {
  return (
    <List>
      <QuoteRequestListTable />
    </List>
  );
}
