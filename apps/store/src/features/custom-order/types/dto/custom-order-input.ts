export interface CreateCustomOrderOptionsDto {
  fabricProvided: boolean;
  reorder: boolean;
  fabricType: "SILK" | "POLY" | null;
  designType: "PRINTING" | "YARN_DYED" | null;
  tieType: "MANUAL" | "AUTO" | null;
  interlining: "POLY" | "WOOL" | null;
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
}

export interface CreateCustomOrderOptionsDtoSnakeCase {
  fabric_provided: boolean;
  reorder: boolean;
  fabric_type: "SILK" | "POLY" | null;
  design_type: "PRINTING" | "YARN_DYED" | null;
  tie_type: "MANUAL" | "AUTO" | null;
  interlining: "POLY" | "WOOL" | null;
  interlining_thickness: "THICK" | "THIN" | null;
  size_type: "ADULT" | "CHILD" | null;
  tie_width: number;
  triangle_stitch: boolean;
  side_stitch: boolean;
  bar_tack: boolean;
  fold7: boolean;
  dimple: boolean;
  spoderato: boolean;
  brand_label: boolean;
  care_label: boolean;
}

export interface CreateCustomOrderRequest {
  shippingAddressId: string;
  options: CreateCustomOrderOptionsDto;
  quantity: number;
  referenceImageUrls: string[];
  additionalNotes: string;
  sample: boolean;
  sampleType: "sewing" | "fabric" | "fabric_and_sewing" | null;
}

export interface CreateCustomOrderRequestDto {
  shipping_address_id: string;
  options: CreateCustomOrderOptionsDtoSnakeCase;
  quantity: number;
  reference_image_urls: string[];
  additional_notes: string;
  sample: boolean;
  sample_type: "sewing" | "fabric" | "fabric_and_sewing" | null;
}
