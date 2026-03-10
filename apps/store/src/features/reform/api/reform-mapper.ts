import { generateItemId } from "@/lib/utils";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { TieItem } from "@yeongseon/shared/types/view/reform";

export const toReformCartItems = (ties: TieItem[], baseCost: number): CartItem[] =>
  ties.map((tie) => ({
    id: generateItemId("reform", tie.id),
    type: "reform",
    quantity: 1,
    reformData: { tie, cost: baseCost },
  }));

export const toReformData = (tie: TieItem, baseCost: number): { tie: TieItem; cost: number } => ({
  tie,
  cost: baseCost,
});
