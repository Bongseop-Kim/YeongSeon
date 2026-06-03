import { AdminPageHeader } from "@/components/AdminPageHeader";
import { InquiryDetailSection } from "@/features/inquiries";

export default function InquiryShow() {
  return (
    <main className="inquiryPage">
      <AdminPageHeader
        title="문의 상세"
        description="고객 문의 내용을 확인하고 답변을 등록합니다."
        className="inquiryHeader"
        titleClassName="inquiryTitle"
        descriptionClassName="inquiryDescription"
      />
      <InquiryDetailSection />
    </main>
  );
}
