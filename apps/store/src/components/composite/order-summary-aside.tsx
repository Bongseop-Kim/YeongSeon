import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";
import {
  UtilityKeyValueRow,
  UtilityPageAside,
} from "@/components/composite/utility-page";

interface SummaryRow {
  label: string;
  value: ReactNode;
  className?: string;
}

interface OrderSummaryAsideProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  rows: SummaryRow[];
  footer?: ReactNode;
  className?: string;
}

export function OrderSummaryAside({
  title = "주문 요약",
  description,
  icon,
  rows,
  footer,
  className,
}: OrderSummaryAsideProps) {
  return (
    <UtilityPageAside
      title={title}
      description={description}
      icon={icon}
      tone="muted"
      className={className ?? "rounded-2xl"}
    >
      <dl>
        {rows.map((row, index) => (
          <UtilityKeyValueRow
            key={index}
            label={row.label}
            value={row.value}
            className={row.className}
          />
        ))}
      </dl>
      {footer}
    </UtilityPageAside>
  );
}
