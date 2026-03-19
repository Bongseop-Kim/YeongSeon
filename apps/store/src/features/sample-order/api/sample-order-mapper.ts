import { normalizeReferenceImages, toDbImageRef } from "@yeongseon/shared";
import type {
  CreateSampleOrderRequest,
  CreateSampleOrderRequestDto,
  SampleOrderOptionsDto,
} from "@/features/sample-order/types/sample-order-input";

export interface CreateSampleOrderFormInput {
  shippingAddressId: string;
  sampleType: "fabric" | "sewing" | "fabric_and_sewing";
  options: SampleOrderOptionsDto;
  referenceImages: CreateSampleOrderRequest["referenceImages"];
  additionalNotes: string;
}

export const toCreateSampleOrderInput = (
  input: CreateSampleOrderFormInput,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseSampleOrderResponse = (
  data: unknown,
): { orderId: string; orderNumber: string } => {
  if (!isRecord(data)) {
    throw new Error(
      "샘플 주문 생성 응답이 올바르지 않습니다: 객체가 아닙니다.",
    );
  }

  if (typeof data.order_id !== "string" || data.order_id.length === 0) {
    throw new Error(
      "샘플 주문 생성 응답이 올바르지 않습니다: order_id가 누락되었거나 형식이 잘못되었습니다.",
    );
  }

  if (typeof data.order_number !== "string" || data.order_number.length === 0) {
    throw new Error(
      "샘플 주문 생성 응답이 올바르지 않습니다: order_number가 누락되었거나 형식이 잘못되었습니다.",
    );
  }

  return {
    orderId: data.order_id,
    orderNumber: data.order_number,
  };
};
