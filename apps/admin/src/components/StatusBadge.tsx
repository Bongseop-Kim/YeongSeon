import type { ReactNode } from "react";
import "./StatusBadge.css";

type StatusBadgeTone =
  | "neutral"
  | "positive"
  | "warning"
  | "critical"
  | "brand";

interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusBadgeTone;
}

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`statusBadge statusBadge-${tone}`}>{children}</span>;
}
