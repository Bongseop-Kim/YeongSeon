import type { CamelToSnakeCase, DbImageRef, ImageRef } from "@yeongseon/shared";

export interface SampleOrderOptionsDto {
  fabricType: "SILK" | "POLY" | null;
  designType: "PRINTING" | "YARN_DYED" | null;
  tieType: "AUTO" | null;
  interlining: "WOOL" | "POLY" | null;
}

export type SampleOrderOptionsDtoSnakeCase =
  CamelToSnakeCase<SampleOrderOptionsDto>;

export interface CreateSampleOrderRequest {
  shippingAddressId: string;
  sampleType: "fabric" | "sewing" | "fabric_and_sewing";
  options: SampleOrderOptionsDto;
  referenceImages: ImageRef[];
  additionalNotes: string;
}

export interface CreateSampleOrderRequestDto {
  shipping_address_id: string;
  sample_type: "fabric" | "sewing" | "fabric_and_sewing";
  options: SampleOrderOptionsDtoSnakeCase;
  reference_images: DbImageRef[];
  additional_notes: string;
}
