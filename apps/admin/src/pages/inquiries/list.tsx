import { InquiryListTable } from "@/features/inquiries";
import "@/features/inquiries/components/inquiries.css";

export default function InquiryList() {
  return (
    <main className="inquiryPage">
      <header className="inquiryHeader">
        <h1 className="inquiryTitle">문의</h1>
        <p className="inquiryDescription">
          고객 문의와 답변 상태를 관리합니다.
        </p>
      </header>
      <InquiryListTable />
    </main>
  );
}
