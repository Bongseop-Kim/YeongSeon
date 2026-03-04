import { generateItemId } from "@/lib/utils";
import { REFORM_BASE_COST } from "@yeongseon/shared/constants/reform-pricing";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { TieItem } from "@yeongseon/shared/types/view/reform";

export const toReformCartItems = (ties: TieItem[]): CartItem[] =>
  ties.map((tie) => ({
    id: generateItemId("reform", tie.id),
    type: "reform",
    quantity: 1,
    reformData: { tie, cost: REFORM_BASE_COST },
  }));

export const toReformData = (tie: TieItem): { tie: TieItem; cost: number } => ({
  tie,
  cost: REFORM_BASE_COST,
});
