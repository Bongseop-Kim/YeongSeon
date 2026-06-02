import type { ReactNode } from "react";
import { Text } from "seed-design/ui/text";
import "./AdminCountBadge.css";

interface AdminCountBadgeProps {
  children: ReactNode;
}

export function AdminCountBadge({ children }: AdminCountBadgeProps) {
  return (
    <Text as="span" textStyle="t2Bold" className="adminPanelCountBadge">
      {children}
    </Text>
  );
}
