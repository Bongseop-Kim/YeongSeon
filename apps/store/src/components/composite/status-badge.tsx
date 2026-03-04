import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@yeongseon/shared/types/view/order";
import type { ClaimStatus } from "@yeongseon/shared/types/view/claim-item";

const ORDER_STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  완료: "bg-green-100 text-green-800",
  배송중: "bg-blue-100 text-blue-800",
  진행중: "bg-yellow-100 text-yellow-800",
  취소: "bg-red-100 text-red-800",
  대기중: "bg-gray-100 text-gray-800",
};

const CLAIM_STATUS_BADGE_CLASS: Record<ClaimStatus, string> = {
  접수: "bg-gray-100 text-gray-800",
  처리중: "bg-blue-100 text-blue-800",
  수거요청: "bg-orange-100 text-orange-800",
  수거완료: "bg-lime-100 text-lime-800",
  재발송: "bg-blue-100 text-blue-800",
  완료: "bg-green-100 text-green-800",
  거부: "bg-red-100 text-red-800",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={ORDER_STATUS_BADGE_CLASS[status]}>{status}</Badge>;
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return <Badge className={CLAIM_STATUS_BADGE_CLASS[status]}>{status}</Badge>;
}
