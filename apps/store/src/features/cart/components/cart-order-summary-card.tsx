import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OrderSummary } from "@/features/order/utils/calculated-order-totals";

interface CartOrderSummaryCardProps {
  summary: OrderSummary;
}

export function CartOrderSummaryCard({ summary }: CartOrderSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 금액</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">상품 금액</span>
            <span>{summary.originalPrice.toLocaleString()}원</span>
          </div>
          {summary.totalDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">할인 금액</span>
              <span className="text-red-500">
                -{summary.totalDiscount.toLocaleString()}원
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600">배송비</span>
            <span>무료</span>
          </div>

          <Separator />

          <div className="flex justify-between text-base font-semibold">
            <span>총 {summary.totalQuantity}개</span>
            <span className="text-lg">{summary.totalPrice.toLocaleString()}원</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
