import { generateItemId } from "@/lib/utils";
import { REFORM_BASE_COST } from "@yeongseon/shared/constants/reform-pricing";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { TieItem } from "@yeongseon/shared/types/view/reform";
import type { ImageKitAuth } from "./reform-api";

export function mapImageKitAuthResponse(data: unknown): ImageKitAuth {
  if (
    typeof data !== "object" ||
    data === null ||
    typeof (data as Record<string, unknown>).signature !== "string" ||
    typeof (data as Record<string, unknown>).token !== "string" ||
    typeof (data as Record<string, unknown>).expire !== "number"
  ) {
    throw new Error("ImageKit 인증 응답 형식이 올바르지 않습니다.");
  }
  const d = data as Record<string, unknown>;
  return {
    signature: d.signature as string,
    token: d.token as string,
    expire: d.expire as number,
  };
}

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
