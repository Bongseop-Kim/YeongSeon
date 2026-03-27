import type { OrderOptions } from "@/features/custom-order/types/order";
import type { SampleOrderOptionsDto } from "@/features/sample-order/types/sample-order-input";
import type { CreateSampleOrderRequest } from "@/features/sample-order/types/sample-order-input";

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
