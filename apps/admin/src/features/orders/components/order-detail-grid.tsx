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
      <dt className="orderDetailLabel">{label}</dt>
      <dd className="orderDetailValue">{children}</dd>
    </div>
  );
}
