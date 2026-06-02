import { Text } from "seed-design/ui/text";
import type { ReactNode } from "react";
import "./AdminDetailList.css";

interface AdminDetailListProps {
  children: ReactNode;
  columns?: 2 | 3;
}

interface AdminDetailItemProps {
  label: string;
  children: ReactNode;
  full?: boolean;
}

export function AdminDetailList({
  children,
  columns = 2,
}: AdminDetailListProps) {
  const className =
    columns === 3
      ? "adminDetailList adminDetailListColumns3"
      : "adminDetailList adminDetailListColumns2";

  return <dl className={className}>{children}</dl>;
}

export function AdminDetailItem({
  label,
  children,
  full,
}: AdminDetailItemProps) {
  const className = full
    ? "adminDetailItem adminDetailItemFull"
    : "adminDetailItem";

  return (
    <div className={className}>
      <Text as="dt" textStyle="t4Medium" className="adminDetailLabel">
        {label}
      </Text>
      <Text as="dd" textStyle="t4Regular" className="adminDetailValue">
        {children}
      </Text>
    </div>
  );
}
