import { AdminPageHeader } from "@/components/AdminPageHeader";
import { QuoteRequestListPanel } from "@/features/quote-requests/components/quote-request-list-table";
import "@/features/quote-requests/components/quote-requests.css";

export default function QuoteRequestList() {
  return (
    <main className="quoteRequestPage">
      <AdminPageHeader
        title="견적 관리"
        description="맞춤 제작 견적 요청과 진행 상태를 확인합니다."
        className="quoteRequestHeader"
        titleClassName="quoteRequestTitle"
        descriptionClassName="quoteRequestDescription"
      />
      <QuoteRequestListPanel />
    </main>
  );
}
