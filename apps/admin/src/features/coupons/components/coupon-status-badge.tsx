import type { ReactNode } from "react";
import { StatusBadge } from "@/components/StatusBadge";

import "./coupon-admin.css";

export function CouponStatusBadge({ active }: { active: boolean }): ReactNode {
  return (
    <StatusBadge tone={active ? "positive" : "neutral"}>
      {active ? "활성" : "비활성"}
    </StatusBadge>
  );
}

export function CouponTextBadge({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <StatusBadge>{children}</StatusBadge>;
}
