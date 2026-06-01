import { Text } from "seed-design/ui/text";
import { useParams } from "react-router-dom";
import { QuoteRequestDetailSection } from "@/features/quote-requests/components/quote-request-detail-section";
import "@/features/quote-requests/components/quote-requests.css";

export default function QuoteRequestShow() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="quoteRequestPage">
      <header className="quoteRequestHeader">
        <Text as="h1" textStyle="screenTitle" className="quoteRequestTitle">
          견적 요청 상세
        </Text>
        <Text as="p" textStyle="t4Regular" className="quoteRequestDescription">
          요청 정보, 제작 사양, 배송지, 견적 입력과 상태 이력을 관리합니다.
        </Text>
      </header>
      <QuoteRequestDetailSection quoteRequestId={id} />
    </main>
  );
}
