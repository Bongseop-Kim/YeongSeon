import {
  UtilityKeyValueRow,
  UtilityPageAside,
} from "@/components/composite/utility-page";
import type { OrderSummary } from "@yeongseon/shared/utils/calculated-order-totals";

interface CartOrderSummaryCardProps {
  summary: OrderSummary;
}

export function CartOrderSummaryCard({ summary }: CartOrderSummaryCardProps) {
  return (
    <UtilityPageAside
      title="주문 금액"
      description="선택한 상품 기준 예상 결제 금액입니다."
      tone="muted"
      className="rounded-2xl"
    >
      <div data-testid="cart-order-summary">
        <UtilityKeyValueRow
          label="상품 금액"
          value={`${summary.originalPrice.toLocaleString()}원`}
        />
        {summary.totalDiscount > 0 ? (
          <UtilityKeyValueRow
            label="할인 금액"
            value={
              <span className="text-red-500">
                -{summary.totalDiscount.toLocaleString()}원
              </span>
            }
          />
        ) : null}
        <UtilityKeyValueRow
          label="배송비"
          value={
            summary.shippingCost > 0
              ? `${summary.shippingCost.toLocaleString()}원`
              : "무료"
          }
        />
        <UtilityKeyValueRow
          className="pt-5"
          label={`총 ${summary.totalQuantity}개`}
          value={
            <span className="text-base font-semibold tracking-tight">
              {summary.totalPrice.toLocaleString()}원
            </span>
          }
        />
      </div>
    </UtilityPageAside>
  );
}
