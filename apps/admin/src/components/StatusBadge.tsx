import type { ReactNode } from "react";
import "./StatusBadge.css";
import { Text } from "seed-design/ui/text";

type StatusBadgeTone =
  | "neutral"
  | "positive"
  | "warning"
  | "critical"
  | "brand";

interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusBadgeTone;
  testId?: string;
}

export function StatusBadge({
  children,
  tone = "neutral",
  testId,
}: StatusBadgeProps) {
  return (
    <Text
      as="span"
      textStyle="t2Bold"
      className={`statusBadge statusBadge-${tone}`}
      data-testid={testId}
    >
      {children}
    </Text>
  );
}
