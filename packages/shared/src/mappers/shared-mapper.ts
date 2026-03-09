import type { Product, ProductOption } from "../types/view/product";
import type { ProductDTO, ProductOptionDTO } from "../types/dto/product";
import type { Coupon, AppliedCoupon } from "../types/view/coupon";
import type { CouponDTO, AppliedCouponDTO } from "../types/dto/coupon";
import type { TieItem } from "../types/view/reform";
import type { TieItemCreateDTO, TieItemDTO } from "../types/dto/reform";
import type { OrderItemDTO, CustomOrderDataDTO } from "../types/dto/order-view";
import type { OrderItem } from "../types/view/order";

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

export const toTieItemDTO = (tie: TieItem): TieItemCreateDTO => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { checked, image, ...rest } = tie;
  return { ...rest, image: typeof image === "string" ? image : undefined };
};

// ── Item Row 공유 정규화 ─────────────────────────────

/** OrderItemRowDTO / ClaimItemRowDTO 공통 nullable 필드 */
interface NullableItemRow {
  id: string;
  type: "product" | "reform" | "custom";
  product: ProductDTO | null;
  selectedOption: ProductOptionDTO | null;
  quantity: number;
  reformData: { tie: TieItemDTO; cost: number } | null;
  customData: CustomOrderDataDTO | null;
  appliedCoupon: AppliedCouponDTO | null;
}

const DELETED_PRODUCT_FALLBACK: ProductDTO = {
  id: -1,
  code: "DELETED",
  name: "삭제된 상품",
  price: 0,
  image: "",
  deleted: true,
  category: "3fold",
  color: "black",
  pattern: "solid",
  material: "silk",
  likes: 0,
  info: "",
  options: [],
};

/**
 * nullable Row → 정규화된 OrderItemDTO (판매/수선/주문제작 구별 유니언)
 * order-mapper, claims-mapper 공통 로직
 */
export const normalizeItemRow = (item: NullableItemRow): OrderItemDTO => {
  if (item.type === "product") {
    return {
      id: item.id,
      type: "product",
      product: item.product ?? DELETED_PRODUCT_FALLBACK,
      selectedOption: item.selectedOption ?? undefined,
      quantity: item.quantity,
      appliedCoupon: item.appliedCoupon ?? undefined,
    };
  }

  if (item.type === "custom") {
    if (!item.customData) {
      throw new Error("주문 제작 데이터가 올바르지 않습니다.");
    }
    return {
      id: item.id,
      type: "custom",
      quantity: item.quantity,
      customData: item.customData,
      appliedCoupon: item.appliedCoupon ?? undefined,
    };
  }

  if (!item.reformData) {
    throw new Error("주문 수선 데이터가 올바르지 않습니다.");
  }

  return {
    id: item.id,
    type: "reform",
    quantity: item.quantity,
    reformData: item.reformData,
    appliedCoupon: item.appliedCoupon ?? undefined,
  };
};

/**
 * OrderItemDTO → OrderItem (View)
 * order-mapper, claims-mapper 공통 DTO→View 변환
 */
export const toOrderItemView = (item: OrderItemDTO): OrderItem => {
  if (item.type === "product") {
    return {
      ...item,
      product: toProductView(item.product),
      selectedOption: item.selectedOption
        ? toProductOptionView(item.selectedOption)
        : undefined,
      appliedCoupon: toAppliedCouponView(item.appliedCoupon),
    };
  }

  if (item.type === "custom") {
    return {
      ...item,
      appliedCoupon: toAppliedCouponView(item.appliedCoupon),
    };
  }

  return {
    ...item,
    reformData: {
      ...item.reformData,
      tie: toTieItemView(item.reformData.tie),
    },
    appliedCoupon: toAppliedCouponView(item.appliedCoupon),
  };
};
