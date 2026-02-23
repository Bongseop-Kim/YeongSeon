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

export interface CreateCustomOrderRequest {
  shippingAddressId: string;
  options: CreateCustomOrderOptionsDto;
  quantity: number;
  referenceImageUrls: string[];
  additionalNotes: string;
  sample: boolean;
}

export interface CreateCustomOrderRequestDto {
  shipping_address_id: string;
  options: CreateCustomOrderOptionsDto;
  quantity: number;
  reference_image_urls: string[];
  additional_notes: string;
  sample: boolean;
}
