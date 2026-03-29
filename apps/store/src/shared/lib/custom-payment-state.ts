import type { ImageRef } from "@yeongseon/shared";
import { isRecord } from "@/shared/lib/type-guard";

interface CustomOrderCoreOptions {
  fabricProvided: boolean;
  reorder: boolean;
  fabricType: "SILK" | "POLY" | null;
  designType: "PRINTING" | "YARN_DYED" | null;
  tieType: "AUTO" | null;
  interlining: "WOOL" | null;
  interliningThickness: "THICK" | "THIN" | null;
  sizeType: "ADULT" | "CHILD" | null;
  tieWidth: number;
  triangleStitch: boolean;
  sideStitch: boolean;
  barTack: boolean;
  fold7: boolean;
  dimple: boolean;
  spoderato: boolean;
  brandLabel: boolean;
  careLabel: boolean;
  quantity: number;
  referenceImages: File[] | null;
}

export type SampleOrderOptions = {
  fabricType: "SILK" | "POLY" | null;
  designType: "PRINTING" | "YARN_DYED" | null;
  tieType: "AUTO" | null;
  interlining: "WOOL" | "POLY" | null;
};

export type CustomOrderPaymentInput = {
  coreOptions: Omit<CustomOrderCoreOptions, "referenceImages">;
  imageRefs: ImageRef[];
  additionalNotes: string;
  totalCost: number;
  shippingAddressId?: string;
};

export type SampleOrderPaymentInput = {
  sampleType: "fabric" | "sewing" | "fabric_and_sewing";
  options: SampleOrderOptions;
  imageRefs: ImageRef[];
  additionalNotes: string;
  samplePrice: number;
  sampleLabel: string;
  fabricLabel: string;
  shippingAddressId?: string;
};

export type CustomOrderPaymentState = {
  orderType: "custom";
} & CustomOrderPaymentInput;
export type SampleOrderPaymentState = {
  orderType: "sample";
} & SampleOrderPaymentInput;

export type CustomPaymentState =
  | CustomOrderPaymentState
  | SampleOrderPaymentState;

const isImageRef = (value: unknown): value is ImageRef =>
  isRecord(value) &&
  typeof value.url === "string" &&
  typeof value.fileId === "string";

const SHARED_FABRIC_TYPES = ["SILK", "POLY"] as const;
const SHARED_DESIGN_TYPES = ["PRINTING", "YARN_DYED"] as const;
const SHARED_TIE_TYPES = ["AUTO"] as const;
const CUSTOM_ORDER_INTERLININGS = ["WOOL"] as const;
const CUSTOM_ORDER_INTERLINING_THICKNESSES = ["THICK", "THIN"] as const;
const CUSTOM_ORDER_SIZE_TYPES = ["ADULT", "CHILD"] as const;
const SAMPLE_ORDER_INTERLININGS = ["WOOL", "POLY"] as const;

const isOneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T => typeof value === "string" && allowed.includes(value as T);

const isNullableOneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T | null => value === null || isOneOf(value, allowed);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isPositiveInteger = (value: unknown): value is number =>
  isFiniteNumber(value) && Number.isInteger(value) && value > 0;

const isCustomOrderOptions = (
  value: unknown,
): value is CustomOrderPaymentInput["coreOptions"] =>
  isRecord(value) &&
  typeof value.fabricProvided === "boolean" &&
  typeof value.reorder === "boolean" &&
  isNullableOneOf(value.fabricType, SHARED_FABRIC_TYPES) &&
  isNullableOneOf(value.designType, SHARED_DESIGN_TYPES) &&
  isNullableOneOf(value.tieType, SHARED_TIE_TYPES) &&
  isNullableOneOf(value.interlining, CUSTOM_ORDER_INTERLININGS) &&
  isNullableOneOf(
    value.interliningThickness,
    CUSTOM_ORDER_INTERLINING_THICKNESSES,
  ) &&
  isNullableOneOf(value.sizeType, CUSTOM_ORDER_SIZE_TYPES) &&
  isFiniteNumber(value.tieWidth) &&
  typeof value.triangleStitch === "boolean" &&
  typeof value.sideStitch === "boolean" &&
  typeof value.barTack === "boolean" &&
  typeof value.fold7 === "boolean" &&
  typeof value.dimple === "boolean" &&
  typeof value.spoderato === "boolean" &&
  typeof value.brandLabel === "boolean" &&
  typeof value.careLabel === "boolean" &&
  isPositiveInteger(value.quantity);

const isSampleOrderOptions = (value: unknown): value is SampleOrderOptions =>
  isRecord(value) &&
  isNullableOneOf(value.fabricType, SHARED_FABRIC_TYPES) &&
  isNullableOneOf(value.designType, SHARED_DESIGN_TYPES) &&
  isNullableOneOf(value.tieType, SHARED_TIE_TYPES) &&
  isNullableOneOf(value.interlining, SAMPLE_ORDER_INTERLININGS);

const isBasePaymentState = (
  state: unknown,
): state is Record<string, unknown> & {
  imageRefs: ImageRef[];
  additionalNotes: string;
  shippingAddressId?: string;
} => {
  if (!isRecord(state)) return false;
  if (!Array.isArray(state.imageRefs) || !state.imageRefs.every(isImageRef)) {
    return false;
  }
  if (typeof state.additionalNotes !== "string") return false;
  if (
    typeof state.shippingAddressId !== "undefined" &&
    typeof state.shippingAddressId !== "string"
  ) {
    return false;
  }
  return true;
};

export const isCustomOrderPaymentState = (
  state: unknown,
): state is CustomOrderPaymentState => {
  if (!isBasePaymentState(state)) return false;

  return (
    state.orderType === "custom" &&
    isFiniteNumber(state.totalCost) &&
    isCustomOrderOptions(state.coreOptions)
  );
};

export const isSampleOrderPaymentState = (
  state: unknown,
): state is SampleOrderPaymentState => {
  if (!isBasePaymentState(state)) return false;

  return (
    state.orderType === "sample" &&
    (state.sampleType === "fabric" ||
      state.sampleType === "sewing" ||
      state.sampleType === "fabric_and_sewing") &&
    isFiniteNumber(state.samplePrice) &&
    typeof state.sampleLabel === "string" &&
    typeof state.fabricLabel === "string" &&
    isSampleOrderOptions(state.options)
  );
};

export const isCustomPaymentState = (
  state: unknown,
): state is CustomPaymentState =>
  isCustomOrderPaymentState(state) || isSampleOrderPaymentState(state);
