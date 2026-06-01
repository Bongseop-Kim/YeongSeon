import { Text } from "seed-design/ui/text";
import { QuoteRequestListPanel } from "@/features/quote-requests/components/quote-request-list-table";
import "@/features/quote-requests/components/quote-requests.css";

export default function QuoteRequestList() {
  return (
    <main className="quoteRequestPage">
      <header className="quoteRequestHeader">
        <Text as="h1" textStyle="screenTitle" className="quoteRequestTitle">
          견적 관리
        </Text>
        <Text as="p" textStyle="t4Regular" className="quoteRequestDescription">
          맞춤 제작 견적 요청과 진행 상태를 확인합니다.
        </Text>
      </header>
      <QuoteRequestListPanel />
    </main>
  );
}
