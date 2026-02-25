import type { OrderOptions } from "@/features/custom-order/types/order";
import { toCreateCustomOrderOptionsInput } from "@/features/custom-order/api/custom-order-mapper";
import type {
  CreateQuoteRequestRequest,
  CreateQuoteRequestRequestDto,
} from "@/features/quote-request/types/dto/quote-request-input";
import type { CreateCustomOrderOptionsDtoSnakeCase } from "@/features/custom-order/types/dto/custom-order-input";

type OrderOptionsForMapping = Omit<
  OrderOptions,
  "referenceImages" | "additionalNotes" | "sample"
>;

const normalizeReferenceImageUrls = (urls: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
};

interface ToCreateQuoteRequestInput {
  shippingAddressId: string;
  options: OrderOptionsForMapping;
  referenceImageUrls: string[];
  additionalNotes: string;
  contactName: string;
  contactTitle: string;
  contactMethod: "email" | "kakao" | "phone";
  contactValue: string;
}

export const toCreateQuoteRequestInput = (
  input: ToCreateQuoteRequestInput
): CreateQuoteRequestRequest => ({
  shippingAddressId: input.shippingAddressId,
  options: toCreateCustomOrderOptionsInput(input.options),
  quantity: input.options.quantity,
  referenceImageUrls: normalizeReferenceImageUrls(input.referenceImageUrls),
  additionalNotes: input.additionalNotes.trim(),
  contactName: input.contactName.trim(),
  contactTitle: input.contactTitle.trim(),
  contactMethod: input.contactMethod,
  contactValue: input.contactValue.trim(),
});

export const toCreateQuoteRequestInputDto = (
  request: CreateQuoteRequestRequest
): CreateQuoteRequestRequestDto => ({
  shipping_address_id: request.shippingAddressId,
  options: {
    fabric_provided: request.options.fabricProvided,
    reorder: request.options.reorder,
    fabric_type: request.options.fabricType,
    design_type: request.options.designType,
    tie_type: request.options.tieType,
    interlining: request.options.interlining,
    interlining_thickness: request.options.interliningThickness,
    size_type: request.options.sizeType,
    tie_width: request.options.tieWidth,
    triangle_stitch: request.options.triangleStitch,
    side_stitch: request.options.sideStitch,
    bar_tack: request.options.barTack,
    fold7: request.options.fold7,
    dimple: request.options.dimple,
    spoderato: request.options.spoderato,
    brand_label: request.options.brandLabel,
    care_label: request.options.careLabel,
  } satisfies CreateCustomOrderOptionsDtoSnakeCase,
  quantity: request.quantity,
  reference_image_urls: request.referenceImageUrls,
  additional_notes: request.additionalNotes,
  contact_name: request.contactName,
  contact_title: request.contactTitle,
  contact_method: request.contactMethod,
  contact_value: request.contactValue,
});
