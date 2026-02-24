import type { AppliedCouponDTO } from "./coupon";
import type { ProductDTO, ProductOptionDTO } from "./product";
import type { TieItemDTO } from "./reform";

export interface CartItemViewDTO {
  id: string;
  type: "product" | "reform";
  product: ProductDTO | null;
  selectedOption?: ProductOptionDTO | null;
  quantity: number;
  reformData: {
    tie: TieItemDTO;
    cost: number;
  } | null;
  appliedCoupon?: AppliedCouponDTO;
  appliedCouponId?: string | null;
}
