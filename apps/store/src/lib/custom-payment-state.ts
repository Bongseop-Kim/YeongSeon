import type { ImageRef } from "@yeongseon/shared";
import type { OrderOptions } from "@/features/custom-order/types/order";
import { isRecord } from "@/lib/type-guard";

export type SampleOrderOptions = {
  fabricType: "SILK" | "POLY" | null;
  designType: "PRINTING" | "YARN_DYED" | null;
  tieType: "AUTO" | null;
  interlining: "WOOL" | "POLY" | null;
};

export type CustomOrderPaymentInput = {
  coreOptions: Omit<OrderOptions, "additionalNotes">;
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

export type CustomPaymentState =
  | ({ orderType: "custom" } & CustomOrderPaymentInput)
  | ({ orderType: "sample" } & SampleOrderPaymentInput);

const isImageRef = (value: unknown): value is ImageRef =>
  isRecord(value) &&
  typeof value.url === "string" &&
  typeof value.fileId === "string";

const isCustomOrderOptions = (
  value: unknown,
): value is CustomOrderPaymentInput["coreOptions"] =>
  isRecord(value) &&
  typeof value.fabricProvided === "boolean" &&
  typeof value.reorder === "boolean" &&
  (typeof value.fabricType === "string" || value.fabricType === null) &&
  (typeof value.designType === "string" || value.designType === null) &&
  (typeof value.tieType === "string" || value.tieType === null) &&
  (typeof value.interlining === "string" || value.interlining === null) &&
  (typeof value.interliningThickness === "string" ||
    value.interliningThickness === null) &&
  (typeof value.sizeType === "string" || value.sizeType === null) &&
  typeof value.tieWidth === "number" &&
  typeof value.triangleStitch === "boolean" &&
  typeof value.sideStitch === "boolean" &&
  typeof value.barTack === "boolean" &&
  typeof value.fold7 === "boolean" &&
  typeof value.dimple === "boolean" &&
  typeof value.spoderato === "boolean" &&
  typeof value.brandLabel === "boolean" &&
  typeof value.careLabel === "boolean" &&
  typeof value.quantity === "number";

const isSampleOrderOptions = (value: unknown): value is SampleOrderOptions =>
  isRecord(value) &&
  (typeof value.fabricType === "string" || value.fabricType === null) &&
  (typeof value.designType === "string" || value.designType === null) &&
  (typeof value.tieType === "string" || value.tieType === null) &&
  (typeof value.interlining === "string" || value.interlining === null);

export const isCustomPaymentState = (
  state: unknown,
): state is CustomPaymentState => {
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

  if (state.orderType === "custom") {
    return (
      typeof state.totalCost === "number" &&
      isCustomOrderOptions(state.coreOptions)
    );
  }

  if (state.orderType === "sample") {
    return (
      (state.sampleType === "fabric" ||
        state.sampleType === "sewing" ||
        state.sampleType === "fabric_and_sewing") &&
      typeof state.samplePrice === "number" &&
      typeof state.sampleLabel === "string" &&
      typeof state.fabricLabel === "string" &&
      isSampleOrderOptions(state.options)
    );
  }

  return false;
};
