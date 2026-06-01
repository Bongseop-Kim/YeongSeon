import { Text } from "seed-design/ui/text";
import type { ReactNode } from "react";

interface OrderDetailGridProps {
  children: ReactNode;
}

interface OrderDetailItemProps {
  label: string;
  children: ReactNode;
  full?: boolean;
}

export function OrderDetailGrid({ children }: OrderDetailGridProps) {
  return <dl className="orderDetailGrid">{children}</dl>;
}

export function OrderDetailItem({
  label,
  children,
  full,
}: OrderDetailItemProps) {
  const className = full
    ? "orderDetailItem orderDetailItemFull"
    : "orderDetailItem";

  return (
    <div className={className}>
      <Text as="dt" textStyle="t4Medium" className="orderDetailLabel">
        {label}
      </Text>
      <Text as="dd" textStyle="t4Regular" className="orderDetailValue">
        {children}
      </Text>
    </div>
  );
}
