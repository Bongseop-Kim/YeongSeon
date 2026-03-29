import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import type { QuoteRequestListItem } from "@/features/quote-request/api/quote-request-api";
import {
  CONTACT_METHOD_LABELS,
  type QuoteRequestStatus,
} from "@yeongseon/shared";
import { formatDate } from "@yeongseon/shared/utils/format-date";

interface QuoteRequestCardProps {
  quoteRequest: QuoteRequestListItem;
  onClick?: () => void;
}

export const QUOTE_REQUEST_BADGE_CLASS: Record<QuoteRequestStatus, string> = {
  요청: "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-100",
  견적발송: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  협의중: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  확정: "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
  종료: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50",
};

export function QuoteRequestCard({
  quoteRequest,
  onClick,
}: QuoteRequestCardProps) {
  return (
    <article
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        onClick &&
          "cursor-pointer transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2",
        "border-b border-stone-200 px-4 py-5 lg:px-0",
      )}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-base font-semibold text-zinc-950">
              견적번호: {quoteRequest.quoteNumber}
            </p>
            <div className="text-sm text-zinc-500">
              요청일: {formatDate(quoteRequest.date)}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0",
              QUOTE_REQUEST_BADGE_CLASS[quoteRequest.status],
            )}
          >
            {quoteRequest.status}
          </Badge>
        </div>

        <div className="space-y-2 text-sm text-zinc-700">
          <div className="flex items-center justify-between gap-3">
            <span>수량</span>
            <span>{quoteRequest.quantity}개</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>담당자</span>
            <span>{quoteRequest.contactName}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>연락 방법</span>
            <span>{CONTACT_METHOD_LABELS[quoteRequest.contactMethod]}</span>
          </div>
          {quoteRequest.quotedAmount != null && (
            <div className="flex items-center justify-between gap-3">
              <span>견적 금액</span>
              <span className="font-semibold text-zinc-900">
                {quoteRequest.quotedAmount.toLocaleString()}원
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
