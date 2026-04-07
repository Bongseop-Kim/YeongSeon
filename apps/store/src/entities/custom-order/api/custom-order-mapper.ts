import type { OrderOptions } from "@/entities/custom-order/model/order";
import type { ImageRef } from "@yeongseon/shared";
import {
  normalizeCouponId,
  normalizeReferenceImages,
  toDbImageRef,
} from "@yeongseon/shared";
import { isRecord } from "@/shared/lib/type-guard";

import type {
  CreateCustomOrderOptionsDto,
  CreateCustomOrderOptionsDtoSnakeCase,
  CreateCustomOrderRequest,
  CreateCustomOrderRequestDto,
} from "@/entities/custom-order/model/dto/custom-order-input";

type OrderOptionsForCreateCustomOrderOptions = Omit<
  OrderOptions,
  "referenceImages" | "additionalNotes"
>;
const isAllowed = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T =>
  typeof value === "string" && allowed.some((candidate) => candidate === value);

const normalizeEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null => (isAllowed(value, allowed) ? value : null);

const normalizeBoolean = (value: unknown): boolean => value === true;

const normalizeNumber = (value: unknown, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
};

export const toCreateCustomOrderOptionsInput = (
  options: OrderOptionsForCreateCustomOrderOptions,
): CreateCustomOrderOptionsDto => ({
  fabricProvided: normalizeBoolean(options.fabricProvided),
  reorder: normalizeBoolean(options.reorder),
  fabricType: normalizeEnum(options.fabricType, ["SILK", "POLY"]),
  designType: normalizeEnum(options.designType, ["PRINTING", "YARN_DYED"]),
  tieType: normalizeEnum(options.tieType, ["AUTO"]),
  interlining: normalizeEnum(options.interlining, ["WOOL"]),
  interliningThickness: normalizeEnum(options.interliningThickness, [
    "THICK",
    "THIN",
  ]),
  sizeType: normalizeEnum(options.sizeType, ["ADULT", "CHILD"]),
  tieWidth: normalizeNumber(options.tieWidth, 8),
  triangleStitch: normalizeBoolean(options.triangleStitch),
  sideStitch: normalizeBoolean(options.sideStitch),
  barTack: normalizeBoolean(options.barTack),
  fold7: normalizeBoolean(options.fold7),
  dimple: normalizeBoolean(options.dimple),
  spoderato: normalizeBoolean(options.spoderato),
  brandLabel: normalizeBoolean(options.brandLabel),
  careLabel: normalizeBoolean(options.careLabel),
});

export const toCustomOrderOptionsDtoSnakeCase = (
  options: CreateCustomOrderOptionsDto,
): CreateCustomOrderOptionsDtoSnakeCase => ({
  fabric_provided: options.fabricProvided,
  reorder: options.reorder,
  fabric_type: options.fabricType,
  design_type: options.designType,
  tie_type: options.tieType,
  interlining: options.interlining,
  interlining_thickness: options.interliningThickness,
  size_type: options.sizeType,
  tie_width: options.tieWidth,
  triangle_stitch: options.triangleStitch,
  side_stitch: options.sideStitch,
  bar_tack: options.barTack,
  fold7: options.fold7,
  dimple: options.dimple,
  spoderato: options.spoderato,
  brand_label: options.brandLabel,
  care_label: options.careLabel,
});

export interface CreateCustomOrderFormInput {
  shippingAddressId: string;
  options: OrderOptionsForCreateCustomOrderOptions;
  referenceImages: ImageRef[];
  additionalNotes: string;
  userCouponId?: string;
}

export const toCreateCustomOrderInput = (
  input: CreateCustomOrderFormInput,
): CreateCustomOrderRequest => {
  const normalizedCouponId = normalizeCouponId(input.userCouponId);

  return {
    shippingAddressId: input.shippingAddressId,
    options: toCreateCustomOrderOptionsInput(input.options),
    quantity: input.options.quantity,
    referenceImages: normalizeReferenceImages(input.referenceImages),
    additionalNotes: input.additionalNotes.trim(),
    ...(normalizedCouponId ? { userCouponId: normalizedCouponId } : {}),
  };
};

export const toCreateCustomOrderInputDto = (
  request: CreateCustomOrderRequest,
): CreateCustomOrderRequestDto => {
  const normalizedCouponId = normalizeCouponId(request.userCouponId);

  return {
    shipping_address_id: request.shippingAddressId,
    options: toCustomOrderOptionsDtoSnakeCase(request.options),
    quantity: request.quantity,
    reference_images: request.referenceImages.map(toDbImageRef),
    additional_notes: request.additionalNotes,
    ...(normalizedCouponId ? { user_coupon_id: normalizedCouponId } : {}),
  };
};

export const parseCreateCustomOrderResponse = (
  data: unknown,
): { orderId: string; orderNumber: string; totalAmount: number } => {
  if (!isRecord(data)) {
    throw new Error("주문제작 생성 응답이 올바르지 않습니다: 객체가 아닙니다.");
  }

  if (
    typeof data.payment_group_id !== "string" ||
    data.payment_group_id.length === 0
  ) {
    throw new Error(
      "주문제작 생성 응답이 올바르지 않습니다: payment_group_id가 누락되었거나 형식이 잘못되었습니다.",
    );
  }

  if (typeof data.order_number !== "string" || data.order_number.length === 0) {
    throw new Error(
      "주문제작 생성 응답이 올바르지 않습니다: order_number가 누락되었거나 형식이 잘못되었습니다.",
    );
  }

  if (
    typeof data.total_amount !== "number" ||
    !Number.isFinite(data.total_amount)
  ) {
    throw new Error(
      "주문제작 생성 응답이 올바르지 않습니다: total_amount가 누락되었거나 형식이 잘못되었습니다.",
    );
  }

  return {
    orderId: data.payment_group_id,
    orderNumber: data.order_number,
    totalAmount: data.total_amount,
  };
};
