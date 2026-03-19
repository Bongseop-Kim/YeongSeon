import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_COLORS } from "@yeongseon/shared/constants/order-status";
import { CLAIM_STATUS_COLORS } from "@yeongseon/shared/constants/claim-status";
import type { OrderStatus } from "@yeongseon/shared/types/view/order";
import type { ClaimStatus } from "@yeongseon/shared/types/view/claim-item";

const COLOR_TO_DOT: Record<string, string> = {
  default: "bg-gray-400",
  warning: "bg-yellow-400",
  processing: "bg-blue-400",
  cyan: "bg-cyan-400",
  orange: "bg-orange-400",
  lime: "bg-lime-400",
  blue: "bg-blue-400",
  geekblue: "bg-indigo-400",
  success: "bg-green-500",
  error: "bg-red-400",
};

const BASE_BADGE_CLASS =
  "bg-white border border-zinc-200 text-zinc-700 text-xs font-medium flex items-center gap-1.5";

function StatusBadge({
  status,
  colorMap,
}: {
  status: string;
  colorMap: Record<string, string>;
}) {
  const dotClass = COLOR_TO_DOT[colorMap[status] ?? "default"] ?? "bg-gray-400";
  return (
    <Badge className={BASE_BADGE_CLASS}>
      <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
      {status}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge status={status} colorMap={ORDER_STATUS_COLORS} />;
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return <StatusBadge status={status} colorMap={CLAIM_STATUS_COLORS} />;
}
