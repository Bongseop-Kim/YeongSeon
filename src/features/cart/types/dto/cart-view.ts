import type { AppliedCouponDTO } from "@/features/order/types/dto/coupon";
import type { ProductDTO, ProductOptionDTO } from "@/features/shop/types/dto/product";
import type { TieItemDTO } from "@/features/reform/types/dto/reform";

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
