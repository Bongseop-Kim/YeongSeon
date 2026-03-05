import { generateItemId } from "@/lib/utils";
import { REFORM_BASE_COST } from "@yeongseon/shared/constants/reform-pricing";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { TieItem } from "@yeongseon/shared/types/view/reform";
import type { ImageKitAuth } from "./reform-api";

function isImageKitAuth(x: unknown): x is ImageKitAuth {
  if (typeof x !== "object" || x === null) return false;

  const obj = x as Record<string, unknown>;
  return (
    typeof obj.signature === "string" &&
    typeof obj.token === "string" &&
    typeof obj.expire === "number"
  );
}

export function mapImageKitAuthResponse(data: unknown): ImageKitAuth {
  if (!isImageKitAuth(data)) {
    throw new Error("ImageKit 인증 응답 형식이 올바르지 않습니다.");
  }
  return {
    signature: data.signature,
    token: data.token,
    expire: data.expire,
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
