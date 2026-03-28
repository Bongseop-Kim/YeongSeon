import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  UtilityKeyValueRow,
  UtilityPageAside,
} from "@/components/composite/utility-page";

interface SummaryRow {
  id: string | number;
  label: string;
  value: ReactNode;
  className?: string;
}

interface OrderSummaryAsideProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  rows: SummaryRow[];
  totalAmount?: number;
  totalLabel?: string;
  footer?: ReactNode;
  className?: string;
}

export function OrderSummaryAside({
  title = "주문 요약",
  description,
  icon,
  rows,
  totalAmount,
  totalLabel = "총 결제 금액",
  footer,
  className,
}: OrderSummaryAsideProps) {
  return (
    <UtilityPageAside
      title={title}
      description={description}
      icon={icon}
      tone="muted"
      className={cn("lg:rounded-2xl", className)}
    >
      <dl>
        {rows.map((row) => (
          <UtilityKeyValueRow
            key={row.id}
            label={row.label}
            value={row.value}
            className={row.className}
          />
        ))}
        {totalAmount !== undefined && (
          <UtilityKeyValueRow
            className="pt-5"
            label={totalLabel}
            value={
              <span className="text-base font-semibold tracking-tight text-foreground">
                {totalAmount.toLocaleString()}원
              </span>
            }
          />
        )}
      </dl>
      {footer}
    </UtilityPageAside>
  );
}
