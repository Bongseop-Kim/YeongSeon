import { Text } from "seed-design/ui/text";
import { InquiryListTable } from "@/features/inquiries";
import "@/features/inquiries/components/inquiries.css";

export default function InquiryList() {
  return (
    <main className="inquiryPage">
      <header className="inquiryHeader">
        <Text as="h1" textStyle="screenTitle" className="inquiryTitle">
          문의
        </Text>
        <Text as="p" textStyle="t4Regular" className="inquiryDescription">
          고객 문의와 답변 상태를 관리합니다.
        </Text>
      </header>
      <InquiryListTable />
    </main>
  );
}
