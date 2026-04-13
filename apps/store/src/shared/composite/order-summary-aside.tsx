import { type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { UtilityKeyValueRow } from "@/shared/composite/utility-page";
import type { SummaryRow } from "@/shared/composite/order-summary-utils";

interface OrderSummaryAsideProps {
  title?: string;
  description?: string;
  rows: SummaryRow[];
  totalAmount?: number;
  totalLabel?: string;
  totalClassName?: string;
  footer?: ReactNode;
  className?: string;
}

export function OrderSummaryAside({
  title = "주문 요약",
  description,
  rows,
  totalAmount,
  totalLabel = "총 결제 금액",
  totalClassName,
  footer,
  className,
}: OrderSummaryAsideProps) {
  return (
    <section className={className}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm leading-6 text-foreground-muted">
          {description}
        </p>
      )}
      <dl className="mt-3">
        {rows.map((row) => (
          <UtilityKeyValueRow
            key={row.id}
            label={row.label}
            value={row.value}
            className={row.className}
          />
        ))}
        {totalAmount !== undefined && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <dt className="text-sm font-medium text-foreground">
              {totalLabel}
            </dt>
            <dd className="min-w-0 text-right">
              <span
                className={cn(
                  "text-base font-semibold tracking-tight text-foreground",
                  totalClassName,
                )}
              >
                {totalAmount.toLocaleString()}원
              </span>
            </dd>
          </div>
        )}
      </dl>
      {footer}
    </section>
  );
}
