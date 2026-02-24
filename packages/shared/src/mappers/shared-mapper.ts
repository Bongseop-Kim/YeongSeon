import type { Product, ProductOption } from "../types/view/product";
import type { ProductDTO, ProductOptionDTO } from "../types/dto/product";
import type { Coupon, AppliedCoupon } from "../types/view/coupon";
import type { CouponDTO, AppliedCouponDTO } from "../types/dto/coupon";
import type { TieItem } from "../types/view/reform";
import type { TieItemDTO } from "../types/dto/reform";

export const toProductOptionView = (option: ProductOptionDTO): ProductOption => ({
  ...option,
});

export const toProductView = (product: ProductDTO): Product => ({
  ...product,
  options: product.options?.map(toProductOptionView),
});

export const toCouponView = (coupon: CouponDTO): Coupon => ({
  ...coupon,
});

export const toAppliedCouponView = (
  coupon?: AppliedCouponDTO
): AppliedCoupon | undefined =>
  coupon
    ? {
        ...coupon,
        coupon: toCouponView(coupon.coupon),
      }
    : undefined;

export const toTieItemView = (tie: TieItemDTO): TieItem => ({
  ...tie,
});

export const toProductOptionDTO = (option: ProductOption): ProductOptionDTO => ({
  ...option,
});

export const toProductDTO = (product: Product): ProductDTO => ({
  ...product,
  options: product.options?.map(toProductOptionDTO),
});

export const toCouponDTO = (coupon: Coupon): CouponDTO => ({
  ...coupon,
});

export const toAppliedCouponDTO = (
  coupon?: AppliedCoupon
): AppliedCouponDTO | undefined =>
  coupon
    ? {
        ...coupon,
        coupon: toCouponDTO(coupon.coupon),
      }
    : undefined;

export const toTieItemDTO = (tie: TieItem): TieItemDTO => ({
  ...tie,
  image: typeof tie.image === "string" ? tie.image : undefined,
});
