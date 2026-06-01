import { Text } from "seed-design/ui/text";
import { InquiryDetailSection } from "@/features/inquiries";
import "@/features/inquiries/components/inquiries.css";

export default function InquiryShow() {
  return (
    <main className="inquiryPage">
      <header className="inquiryHeader">
        <Text as="h1" textStyle="screenTitle" className="inquiryTitle">
          문의 상세
        </Text>
        <Text as="p" textStyle="t4Regular" className="inquiryDescription">
          고객 문의 내용을 확인하고 답변을 등록합니다.
        </Text>
      </header>
      <InquiryDetailSection />
    </main>
  );
}
