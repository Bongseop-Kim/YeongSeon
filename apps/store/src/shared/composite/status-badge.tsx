import { Badge } from "@/shared/ui/badge";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from "@yeongseon/shared/constants/order-status";
import { CLAIM_STATUS_COLORS } from "@yeongseon/shared/constants/claim-status";
import type { OrderStatus } from "@yeongseon/shared/types/view/order";
import type { ClaimStatus } from "@yeongseon/shared/types/view/claim-item";

const COLOR_TO_DOT: Record<string, string> = {
  default: "bg-foreground-muted",
  warning: "bg-warning",
  processing: "bg-info",
  cyan: "bg-info",
  orange: "bg-warning",
  lime: "bg-success",
  blue: "bg-info",
  geekblue: "bg-info",
  success: "bg-success",
  error: "bg-destructive",
};

const BASE_BADGE_CLASS =
  "flex items-center gap-1.5 border-border/80 bg-surface px-2.5 py-1 text-xs font-medium text-foreground-subtle shadow-none";

function StatusBadge({
  status,
  label,
  colorMap,
}: {
  status: string;
  label?: string;
  colorMap: Record<string, string>;
}) {
  const dotClass =
    COLOR_TO_DOT[colorMap[status] ?? "default"] ?? "bg-foreground-muted";
  return (
    <Badge className={BASE_BADGE_CLASS}>
      <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
      {label ?? status}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <StatusBadge
      status={status}
      label={ORDER_STATUS_LABELS[status] ?? status}
      colorMap={ORDER_STATUS_COLORS}
    />
  );
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return <StatusBadge status={status} colorMap={CLAIM_STATUS_COLORS} />;
}
