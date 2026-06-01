import { Text } from "seed-design/ui/text";
import type { ReactNode } from "react";

import "./coupon-admin.css";

export function CouponStatusBadge({ active }: { active: boolean }): ReactNode {
  return (
    <Text
      as="span"
      textStyle="t2Bold"
      className={`couponBadge ${active ? "couponBadgePositive" : "couponBadgeMuted"}`}
    >
      {active ? "활성" : "비활성"}
    </Text>
  );
}

export function CouponTextBadge({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <Text as="span" textStyle="t2Bold" className="couponBadge">
      {children}
    </Text>
  );
}
