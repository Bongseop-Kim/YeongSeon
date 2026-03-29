import type { ImageRef } from "@yeongseon/shared";
import type {
  CreateCustomOrderOptionsDto,
  CreateCustomOrderOptionsDtoSnakeCase,
  DbImageRef,
} from "@/entities/custom-order/model/dto/custom-order-input";

export interface CreateQuoteRequestRequest {
  shippingAddressId: string;
  options: CreateCustomOrderOptionsDto;
  quantity: number;
  referenceImages: ImageRef[];
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
  reference_images: DbImageRef[];
  additional_notes: string;
  contact_name: string;
  contact_title: string;
  contact_method: "email" | "kakao" | "phone";
  contact_value: string;
}
