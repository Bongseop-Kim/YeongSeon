import type { OrderOptions } from "@/features/custom-order/types/order";
import type { SampleOrderOptionsDto } from "@/features/sample-order/types/sample-order-input";
import type { CreateSampleOrderRequest } from "@/features/sample-order/types/sample-order-input";
import { isRecord } from "@/lib/type-guard";

type ImageRef = CreateSampleOrderRequest["referenceImages"][number];

export type CustomOrderPaymentInput = {
  coreOptions: Omit<OrderOptions, "additionalNotes">;
  imageRefs: ImageRef[];
  additionalNotes: string;
  totalCost: number;
};

export type SampleOrderPaymentInput = {
  sampleType: "fabric" | "sewing" | "fabric_and_sewing";
  options: SampleOrderOptionsDto;
  imageRefs: ImageRef[];
  additionalNotes: string;
  samplePrice: number;
  sampleLabel: string;
  fabricLabel: string;
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
  typeof value.sizeType === "string" &&
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

const isSampleOrderOptions = (
  value: unknown,
): value is SampleOrderPaymentInput["options"] =>
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
