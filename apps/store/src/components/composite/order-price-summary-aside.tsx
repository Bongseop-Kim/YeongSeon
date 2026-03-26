import { cn } from "@/lib/utils";
import {
  UtilityKeyValueRow,
  UtilityPageAside,
} from "@/components/composite/utility-page";

interface OrderPriceSummaryAsideProps {
  title?: string;
  description?: string;
  originalPrice: number;
  totalDiscount: number;
  shippingCost: number;
  totalPrice: number;
  totalLabel?: string;
  totalClassName?: string;
  "data-testid"?: string;
}

export function OrderPriceSummaryAside({
  title = "결제 금액",
  description,
  originalPrice,
  totalDiscount,
  shippingCost,
  totalPrice,
  totalLabel = "총 결제 금액",
  totalClassName,
  "data-testid": testId,
}: OrderPriceSummaryAsideProps) {
  return (
    <UtilityPageAside
      title={title}
      description={description}
      tone="muted"
      className="rounded-2xl"
    >
      <div data-testid={testId}>
        <UtilityKeyValueRow
          label="상품 금액"
          value={`${originalPrice.toLocaleString()}원`}
        />
        {totalDiscount > 0 ? (
          <UtilityKeyValueRow
            label="할인 금액"
            value={
              <span className="text-red-500">
                -{totalDiscount.toLocaleString()}원
              </span>
            }
          />
        ) : null}
        <UtilityKeyValueRow
          label="배송비"
          value={
            shippingCost > 0 ? `${shippingCost.toLocaleString()}원` : "무료"
          }
        />
        <UtilityKeyValueRow
          className="pt-5"
          label={totalLabel}
          value={
            <span
              className={cn(
                "text-base font-semibold tracking-tight",
                totalClassName,
              )}
            >
              {totalPrice.toLocaleString()}원
            </span>
          }
        />
      </div>
    </UtilityPageAside>
  );
}
