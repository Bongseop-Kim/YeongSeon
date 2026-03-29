import type { CheckoutSummaryRow } from "./CheckoutOptionPrimitives";

export function createAmountSummaryRow(amount: number): CheckoutSummaryRow {
  return {
    id: "amount",
    label: "상품 금액",
    value: `${amount.toLocaleString()}원`,
  };
}
