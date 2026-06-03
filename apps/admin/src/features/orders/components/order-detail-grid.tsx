import { AdminDetailItem, AdminDetailList } from "@/components/AdminDetailList";
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
  return <AdminDetailList>{children}</AdminDetailList>;
}

export function OrderDetailItem({
  label,
  children,
  full,
}: OrderDetailItemProps) {
  return (
    <AdminDetailItem label={label} full={full}>
      {children}
    </AdminDetailItem>
  );
}
