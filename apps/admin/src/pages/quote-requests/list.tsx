import { QuoteRequestListPanel } from "@/features/quote-requests/components/quote-request-list-table";
import "@/features/quote-requests/components/quote-requests.css";

export default function QuoteRequestList() {
  return (
    <main className="quoteRequestPage">
      <header className="quoteRequestHeader">
        <h1 className="quoteRequestTitle">견적 관리</h1>
        <p className="quoteRequestDescription">
          맞춤 제작 견적 요청과 진행 상태를 확인합니다.
        </p>
      </header>
      <QuoteRequestListPanel />
    </main>
  );
}
