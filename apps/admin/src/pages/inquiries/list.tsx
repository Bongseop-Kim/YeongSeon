import { List } from "@refinedev/antd";
import { InquiryListTable } from "@/features/inquiries/components/inquiry-list-table";

export default function InquiryList() {
  return (
    <List>
      <InquiryListTable />
    </List>
  );
}
