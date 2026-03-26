import type { Product, ProductOption } from "../types/view/product";
import type { ProductDTO, ProductOptionDTO } from "../types/dto/product";
import type { Coupon, AppliedCoupon } from "../types/view/coupon";
import type { CouponDTO, AppliedCouponDTO } from "../types/dto/coupon";
import type { TieItem } from "../types/view/reform";
import type { TieItemCreateDTO, TieItemDTO } from "../types/dto/reform";
import type {
  OrderItemDTO,
  CustomOrderDataDTO,
  SampleOrderDataDTO,
} from "../types/dto/order-view";
import type { OrderItem } from "../types/view/order";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const toProductOptionView = (
  option: ProductOptionDTO,
): ProductOption => ({
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
  coupon?: AppliedCouponDTO,
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

export const toProductOptionDTO = (
  option: ProductOption,
): ProductOptionDTO => ({
  ...option,
});

export const toProductDTO = (product: Product): ProductDTO => ({
  id: product.id,
  code: product.code,
  name: product.name,
  price: product.price,
  image: product.image,
  deleted: product.deleted,
  detailImages: product.detailImages,
  category: product.category,
  color: product.color,
  pattern: product.pattern,
  material: product.material,
  likes: product.likes,
  isLiked: product.isLiked,
  info: product.info,
  stock: product.stock,
  options: product.options?.map(toProductOptionDTO),
});

export const toCouponDTO = (coupon: Coupon): CouponDTO => ({
  ...coupon,
});

export const toAppliedCouponDTO = (
  coupon?: AppliedCoupon,
): AppliedCouponDTO | undefined =>
  coupon
    ? {
        ...coupon,
        coupon: toCouponDTO(coupon.coupon),
      }
    : undefined;

export const toTieItemDTO = (tie: TieItem): TieItemCreateDTO => {
  const { checked, image, ...rest } = tie;
  return { ...rest, image: typeof image === "string" ? image : undefined };
};

export function parseCustomOrderData(
  raw: Record<string, unknown>,
): CustomOrderDataDTO {
  const rawKeys = Object.keys(raw);
  const rawOptions = raw.options;
  const rawPricing = raw.pricing;
  const invalidFields = [
    !isRecord(rawOptions) ? "options" : null,
    !isRecord(rawPricing) ? "pricing" : null,
  ].filter((field): field is string => field !== null);

  if (!isRecord(rawOptions) || !isRecord(rawPricing)) {
    throw new Error(
      `custom order data 검증 실패: ${invalidFields.join(", ")} 필드 오류 (raw keys: ${rawKeys.join(", ")})`,
    );
  }

  const sewingCost = rawPricing.sewing_cost;
  const fabricCost = rawPricing.fabric_cost;
  const rawSampleCost = rawPricing.sample_cost;
  if (
    rawSampleCost !== undefined &&
    rawSampleCost !== null &&
    typeof rawSampleCost !== "number"
  ) {
    throw new Error(
      `custom order data 검증 실패: pricing.sample_cost 필드 오류 (raw keys: ${rawKeys.join(", ")})`,
    );
  }
  const sampleCost = typeof rawSampleCost === "number" ? rawSampleCost : 0;
  const totalCost = rawPricing.total_cost;
  const invalidPricingFields: string[] = [];

  if (typeof sewingCost !== "number") {
    invalidPricingFields.push("pricing.sewing_cost");
  }
  if (typeof fabricCost !== "number") {
    invalidPricingFields.push("pricing.fabric_cost");
  }
  if (typeof totalCost !== "number") {
    invalidPricingFields.push("pricing.total_cost");
  }

  if (
    typeof sewingCost !== "number" ||
    typeof fabricCost !== "number" ||
    typeof totalCost !== "number"
  ) {
    throw new Error(
      `custom order data 검증 실패: ${invalidPricingFields.join(", ")} 필드 오류 (raw keys: ${rawKeys.join(", ")})`,
    );
  }

  const referenceImageUrls = Array.isArray(raw.reference_images)
    ? raw.reference_images
        .filter(
          (item): item is { url: string } =>
            isRecord(item) && typeof item.url === "string",
        )
        .map((item) => item.url)
    : [];

  return {
    options: {
      tieType:
        typeof rawOptions.tie_type === "string" ? rawOptions.tie_type : null,
      interlining:
        typeof rawOptions.interlining === "string"
          ? rawOptions.interlining
          : null,
      designType:
        typeof rawOptions.design_type === "string"
          ? rawOptions.design_type
          : null,
      fabricType:
        typeof rawOptions.fabric_type === "string"
          ? rawOptions.fabric_type
          : null,
      fabricProvided: rawOptions.fabric_provided === true,
      triangleStitch: rawOptions.triangle_stitch === true,
      sideStitch: rawOptions.side_stitch === true,
      barTack: rawOptions.bar_tack === true,
      dimple: rawOptions.dimple === true,
      spoderato: rawOptions.spoderato === true,
      fold7: rawOptions.fold7 === true,
      brandLabel: rawOptions.brand_label === true,
      careLabel: rawOptions.care_label === true,
    },
    pricing: {
      sewingCost,
      fabricCost,
      sampleCost,
      totalCost,
    },
    sample: raw.sample === true,
    sampleType: typeof raw.sample_type === "string" ? raw.sample_type : null,
    referenceImageUrls,
    additionalNotes:
      typeof raw.additional_notes === "string" ? raw.additional_notes : null,
  };
}

export function parseSampleOrderData(
  raw: Record<string, unknown>,
): SampleOrderDataDTO {
  const rawOptions = isRecord(raw.options) ? raw.options : {};
  const rawPricing = isRecord(raw.pricing) ? raw.pricing : {};
  const sampleType = raw.sample_type;
  const totalCost = rawPricing.total_cost;

  if (
    sampleType !== "fabric" &&
    sampleType !== "sewing" &&
    sampleType !== "fabric_and_sewing"
  ) {
    throw new Error("sample order data 검증 실패: sample_type 필드 오류");
  }

  if (typeof totalCost !== "number") {
    throw new Error(
      "sample order data 검증 실패: pricing.total_cost 필드 오류",
    );
  }

  const referenceImageUrls = Array.isArray(raw.reference_images)
    ? raw.reference_images
        .filter(
          (item): item is { url: string } =>
            isRecord(item) && typeof item.url === "string",
        )
        .map((item) => item.url)
    : [];
  const designType =
    typeof rawOptions.design_type === "string" ? rawOptions.design_type : null;

  if (
    (sampleType === "fabric" || sampleType === "fabric_and_sewing") &&
    designType === null
  ) {
    throw new Error(
      "sample order data 검증 실패: fabric/fabric_and_sewing 샘플은 options.design_type이 필요합니다",
    );
  }

  return {
    sampleType,
    options: {
      fabricType:
        typeof rawOptions.fabric_type === "string"
          ? rawOptions.fabric_type
          : null,
      designType,
      tieType:
        typeof rawOptions.tie_type === "string" ? rawOptions.tie_type : null,
      interlining:
        typeof rawOptions.interlining === "string"
          ? rawOptions.interlining
          : null,
    },
    pricing: {
      totalCost,
    },
    referenceImageUrls,
    additionalNotes:
      typeof raw.additional_notes === "string" ? raw.additional_notes : null,
  };
}

// ── Item Row 공유 정규화 ─────────────────────────────

/** OrderItemRowDTO / ClaimItemRowDTO 공통 nullable 필드 */
export interface NullableItemRow {
  id: string;
  type: "product" | "reform" | "custom" | "token" | "sample";
  product: ProductDTO | null;
  selectedOption: ProductOptionDTO | null;
  quantity: number;
  reformData: { tie: TieItemDTO; cost: number } | null;
  customData: CustomOrderDataDTO | null;
  sampleData?: SampleOrderDataDTO | null;
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

  if (item.type === "sample") {
    return {
      id: item.id,
      type: "sample",
      quantity: item.quantity,
      sampleData: item.sampleData ?? null,
      appliedCoupon: item.appliedCoupon ?? undefined,
    };
  }

  if (item.type === "token") {
    return {
      id: item.id,
      type: "token",
      quantity: item.quantity,
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

  if (item.type === "sample") {
    return {
      ...item,
      appliedCoupon: toAppliedCouponView(item.appliedCoupon),
    };
  }

  if (item.type === "token") {
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
