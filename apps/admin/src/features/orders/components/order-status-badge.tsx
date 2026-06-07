import { StatusBadge } from "@/components/StatusBadge";

interface OrderStatusBadgeProps {
  children: string;
  testId?: string;
}

function getOrderStatusTone(status: string) {
  if (status.includes("완료") || status === "구매확정") return "positive";
  if (status.includes("취소") || status.includes("실패")) return "critical";
  if (
    status.includes("배송") ||
    status.includes("준비") ||
    status.includes("중")
  ) {
    return "warning";
  }
  return "neutral";
}

export function OrderStatusBadge({ children, testId }: OrderStatusBadgeProps) {
  return (
    <StatusBadge tone={getOrderStatusTone(children)} testId={testId}>
      {children}
    </StatusBadge>
  );
}
