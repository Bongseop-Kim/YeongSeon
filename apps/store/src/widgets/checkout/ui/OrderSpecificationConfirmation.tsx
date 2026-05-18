import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface SpecificationSummaryItem {
  label: string;
  content: ReactNode;
}

interface SpecificationOptionRow {
  label: string;
  value: string;
}

interface OrderSpecificationConfirmationProps {
  testId: string;
  recipientName: string | null | undefined;
  summaryItems: SpecificationSummaryItem[];
  optionRows: SpecificationOptionRow[];
  totalCost?: number;
  amountLabel?: ReactNode;
  amountFallback?: ReactNode;
  className?: string;
}

const SUPPLIER = "영선산업 | 305-26-32033";

export const formatSpecificationMoney = (value: number) =>
  value.toLocaleString("ko-KR");

function EstimateOptionRow({ label, value }: SpecificationOptionRow) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 text-sm leading-6">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-950">{value}</dd>
    </div>
  );
}

function SpecificationSummaryItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-stone-200 pb-4 last:border-b-0 last:pb-0 md:border-b-0 md:pb-0">
      <p className="text-xs text-zinc-500">{label}</p>
      <div className="mt-2 text-sm font-semibold leading-6 text-zinc-950">
        {children}
      </div>
    </div>
  );
}

export function OrderSpecificationConfirmation({
  testId,
  recipientName,
  summaryItems,
  optionRows,
  totalCost,
  amountLabel = "합 계 금 액",
  amountFallback,
  className,
}: OrderSpecificationConfirmationProps) {
  const displayRecipientName = recipientName?.trim() || "고객";

  return (
    <section
      data-testid={testId}
      className={cn(
        "overflow-hidden rounded-lg border border-stone-300 bg-white text-zinc-950 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b border-stone-300 bg-stone-100/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
          <h3 className="text-lg font-semibold tracking-tight">
            주문 사양 확인
          </h3>
        </div>
      </div>

      <div className="grid border-b border-stone-300 sm:grid-cols-2">
        <div className="border-b border-stone-300 px-5 py-4 sm:border-b-0 sm:border-r">
          <p className="text-xs text-zinc-500">수신</p>
          <p className="mt-2 text-sm font-semibold text-zinc-950">
            {displayRecipientName} 귀하
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-zinc-500">공급자</p>
          <p className="mt-2 text-sm font-semibold text-zinc-950">{SUPPLIER}</p>
        </div>
      </div>

      <div className="border-b border-stone-300 px-5 py-5">
        <div className="grid gap-4 md:grid-cols-4 md:gap-6">
          {summaryItems.map((item) => (
            <SpecificationSummaryItem key={item.label} label={item.label}>
              {item.content}
            </SpecificationSummaryItem>
          ))}
        </div>
      </div>

      <div className="border-b border-stone-300 px-5 py-5">
        <h4 className="text-sm font-semibold text-zinc-950">제작 옵션</h4>
        <dl className="mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
          {optionRows.map((row) => (
            <EstimateOptionRow key={row.label} {...row} />
          ))}
        </dl>
      </div>

      <div className="flex items-center justify-between gap-4 bg-zinc-950 px-5 py-4 text-white">
        <span className="text-sm font-semibold tracking-[0.16em]">
          {amountLabel}
        </span>
        <strong className="text-xl font-bold">
          {typeof totalCost === "number"
            ? `₩${formatSpecificationMoney(totalCost)}`
            : amountFallback}
        </strong>
      </div>
    </section>
  );
}
