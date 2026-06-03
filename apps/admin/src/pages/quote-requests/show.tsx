import { useParams } from "react-router-dom";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { QuoteRequestDetailSection } from "@/features/quote-requests";

export default function QuoteRequestShow() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="quoteRequestPage">
      <AdminPageHeader
        title="견적 요청 상세"
        description="요청 정보, 제작 사양, 배송지, 견적 입력과 상태 이력을 관리합니다."
        className="quoteRequestHeader"
        titleClassName="quoteRequestTitle"
        descriptionClassName="quoteRequestDescription"
      />
      <QuoteRequestDetailSection quoteRequestId={id} />
    </main>
  );
}
