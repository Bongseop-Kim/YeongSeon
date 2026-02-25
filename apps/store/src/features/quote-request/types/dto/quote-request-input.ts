import type { CreateCustomOrderOptionsDto, CreateCustomOrderOptionsDtoSnakeCase } from "@/features/custom-order/types/dto/custom-order-input";

export interface CreateQuoteRequestRequest {
  shippingAddressId: string;
  options: CreateCustomOrderOptionsDto;
  quantity: number;
  referenceImageUrls: string[];
  additionalNotes: string;
  contactName: string;
  contactTitle: string;
  contactMethod: "email" | "kakao" | "phone";
  contactValue: string;
}

export interface CreateQuoteRequestRequestDto {
  shipping_address_id: string;
  options: CreateCustomOrderOptionsDtoSnakeCase;
  quantity: number;
  reference_image_urls: string[];
  additional_notes: string;
  contact_name: string;
  contact_title: string;
  contact_method: "email" | "kakao" | "phone";
  contact_value: string;
}
