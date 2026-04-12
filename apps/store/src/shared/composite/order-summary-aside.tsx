import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { UtilityKeyValueRow } from "@/shared/composite/utility-page";

export interface SummaryRow {
  id: string | number;
  label: string;
  value: ReactNode;
  className?: string;
}

export interface PriceTotals {
  originalPrice: number;
  totalDiscount: number;
  shippingCost: number;
}

export function buildPriceRows(totals: PriceTotals): SummaryRow[] {
  return [
    {
      id: "original-price",
      label: "상품 금액",
      value: `${totals.originalPrice.toLocaleString()}원`,
    },
    ...(totals.totalDiscount > 0
      ? [
          {
            id: "discount",
            label: "할인 금액",
            value: (
              <span className="text-red-500">
                -{totals.totalDiscount.toLocaleString()}원
              </span>
            ),
          },
        ]
      : []),
    {
      id: "shipping",
      label: "배송비",
      value:
        totals.shippingCost > 0
          ? `${totals.shippingCost.toLocaleString()}원`
          : "무료",
    },
  ];
}

interface OrderSummaryAsideProps {
  title?: string;
  description?: string;
  icon?: LucideIcon; // flat 레이아웃에서 미사용 — 하위 호환성을 위해 유지
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
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      {description && (
        <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
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
          <div className="flex items-center justify-between border-t border-stone-950 pt-3">
            <dt className="text-sm font-medium text-zinc-950">{totalLabel}</dt>
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
