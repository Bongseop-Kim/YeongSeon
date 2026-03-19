import { normalizeReferenceImages, toDbImageRef } from "@yeongseon/shared";
import type {
  CreateSampleOrderRequest,
  CreateSampleOrderRequestDto,
  SampleOrderOptionsDto,
} from "@/features/sample-order/types/sample-order-input";

interface ToCreateSampleOrderInput {
  shippingAddressId: string;
  sampleType: "fabric" | "sewing" | "fabric_and_sewing";
  options: SampleOrderOptionsDto;
  referenceImages: CreateSampleOrderRequest["referenceImages"];
  additionalNotes: string;
}

export const toCreateSampleOrderInput = (
  input: ToCreateSampleOrderInput,
): CreateSampleOrderRequest => ({
  shippingAddressId: input.shippingAddressId,
  sampleType: input.sampleType,
  options: input.options,
  referenceImages: normalizeReferenceImages(input.referenceImages),
  additionalNotes: input.additionalNotes.trim(),
});

export const toCreateSampleOrderInputDto = (
  request: CreateSampleOrderRequest,
): CreateSampleOrderRequestDto => ({
  shipping_address_id: request.shippingAddressId,
  sample_type: request.sampleType,
  options: {
    fabric_type: request.options.fabricType,
    design_type: request.options.designType,
    tie_type: request.options.tieType,
    interlining: request.options.interlining,
  },
  reference_images: request.referenceImages.map(toDbImageRef),
  additional_notes: request.additionalNotes,
});
