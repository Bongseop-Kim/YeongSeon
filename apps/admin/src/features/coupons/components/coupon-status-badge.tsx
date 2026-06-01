import type { ReactNode } from "react";

import "./coupon-admin.css";

export function CouponStatusBadge({ active }: { active: boolean }): ReactNode {
  return (
    <span
      className={`couponBadge ${active ? "couponBadgePositive" : "couponBadgeMuted"}`}
    >
      {active ? "활성" : "비활성"}
    </span>
  );
}

export function CouponTextBadge({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <span className="couponBadge">{children}</span>;
}
