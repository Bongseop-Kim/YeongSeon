import { OrderPriceSummaryAside } from "@/components/composite/order-price-summary-aside";
import type { OrderSummary } from "@yeongseon/shared/utils/calculated-order-totals";

interface CartOrderSummaryCardProps {
  summary: OrderSummary;
}

export function CartOrderSummaryCard({ summary }: CartOrderSummaryCardProps) {
  return (
    <OrderPriceSummaryAside
      title="주문 금액"
      description="선택한 상품 기준 예상 결제 금액입니다."
      originalPrice={summary.originalPrice}
      totalDiscount={summary.totalDiscount}
      shippingCost={summary.shippingCost}
      totalPrice={summary.totalPrice}
      totalLabel={`총 ${summary.totalQuantity}개`}
      data-testid="cart-order-summary"
    />
  );
}
