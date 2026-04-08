import { generateItemId } from "@/shared/lib/utils";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { TieItem } from "@yeongseon/shared/types/view/reform";

export interface ReformPricing {
  baseCost: number;
  widthReformCost: number;
}

export function calcTieCost(tie: TieItem, pricing: ReformPricing): number {
  const hasLengthReform = tie.hasLengthReform !== false;
  const hasWidthReform = tie.hasWidthReform === true;

  return (
    (hasLengthReform ? pricing.baseCost : 0) +
    (hasWidthReform ? pricing.widthReformCost : 0)
  );
}

export const toReformCartItems = (
  ties: TieItem[],
  pricing: ReformPricing,
): CartItem[] =>
  ties.map((tie) => ({
    id: generateItemId("reform", tie.id ?? ""),
    type: "reform",
    quantity: 1,
    reformData: { tie, cost: calcTieCost(tie, pricing) },
  }));

export const toReformData = (
  tie: TieItem,
  pricing: ReformPricing,
): { tie: TieItem; cost: number } => ({
  tie,
  cost: calcTieCost(tie, pricing),
});
