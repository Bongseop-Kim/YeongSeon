import { List } from "@refinedev/antd";
import { InquiryListTable } from "@/features/inquiries";

export default function InquiryList() {
  return (
    <List>
      <InquiryListTable />
    </List>
  );
}
