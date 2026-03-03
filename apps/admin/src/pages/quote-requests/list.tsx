import { List } from "@refinedev/antd";
import { QuoteRequestListTable } from "@/features/quote-requests/components/quote-request-list-table";

export default function QuoteRequestList() {
  return (
    <List>
      <QuoteRequestListTable />
    </List>
  );
}
