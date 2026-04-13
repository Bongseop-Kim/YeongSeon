import { createElement, type ReactNode } from "react";

export interface SummaryRow {
  id: string | number;
  label: string;
  value: ReactNode;
  className?: string;
}

interface PriceTotals {
  originalPrice: number;
  totalDiscount: number;
  shippingCost: number;
}

export function buildPriceRows(totals: PriceTotals): SummaryRow[] {
  return [
    {
      id: "original-price",
      label: "상품 금액",
      value: `${totals.originalPrice.toLocaleString()}원`,
    },
    ...(totals.totalDiscount > 0
      ? [
          {
            id: "discount",
            label: "할인 금액",
            value: createElement(
              "span",
              { className: "text-red-500" },
              `-${totals.totalDiscount.toLocaleString()}원`,
            ),
          },
        ]
      : []),
    {
      id: "shipping",
      label: "배송비",
      value:
        totals.shippingCost > 0
          ? `${totals.shippingCost.toLocaleString()}원`
          : "무료",
    },
  ];
}
