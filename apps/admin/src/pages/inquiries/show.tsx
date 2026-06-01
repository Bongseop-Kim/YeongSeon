import { InquiryDetailSection } from "@/features/inquiries";
import "@/features/inquiries/components/inquiries.css";

export default function InquiryShow() {
  return (
    <main className="inquiryPage">
      <header className="inquiryHeader">
        <h1 className="inquiryTitle">문의 상세</h1>
        <p className="inquiryDescription">
          고객 문의 내용을 확인하고 답변을 등록합니다.
        </p>
      </header>
      <InquiryDetailSection />
    </main>
  );
}
