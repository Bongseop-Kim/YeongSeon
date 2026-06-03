import { AdminPageHeader } from "@/components/AdminPageHeader";
import { InquiryListTable } from "@/features/inquiries";

export default function InquiryList() {
  return (
    <main className="inquiryPage">
      <AdminPageHeader
        title="문의"
        description="고객 문의와 답변 상태를 관리합니다."
        className="inquiryHeader"
        titleClassName="inquiryTitle"
        descriptionClassName="inquiryDescription"
      />
      <InquiryListTable />
    </main>
  );
}
