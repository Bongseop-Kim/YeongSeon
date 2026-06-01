import { ORDER_STATUS_COLORS } from "@yeongseon/shared";

type StatusBadgeTone =
  | "neutral"
  | "positive"
  | "warning"
  | "critical"
  | "brand";

export function getClaimStatusTone(status: string): StatusBadgeTone {
  if (status === "완료") return "positive";
  if (status === "거부") return "critical";
  if (status === "수거요청" || status === "수거완료") return "warning";
  if (status === "처리중" || status === "재발송") return "brand";
  return "neutral";
}

export function getOrderStatusTone(status: string): StatusBadgeTone {
  const color = ORDER_STATUS_COLORS[status];
  if (color === "success") return "positive";
  if (color === "error") return "critical";
  if (color === "warning" || color === "orange") return "warning";
  if (color === "processing" || color === "blue") return "brand";
  return "neutral";
}
