import type { AppliedCouponDTO } from "./coupon";
import type { ProductDTO, ProductOptionDTO } from "./product";
import type { TieItemCreateDTO } from "./reform";

export interface CartItemInputDTO {
  id: string;
  type: "product" | "reform";
  product: ProductDTO | null;
  selectedOption?: ProductOptionDTO | null;
  quantity: number;
  reformData: {
    tie: TieItemCreateDTO;
    cost: number;
  } | null;
  appliedCoupon?: AppliedCouponDTO;
  appliedCouponId?: string | null;
}
