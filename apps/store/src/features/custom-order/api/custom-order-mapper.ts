import type { OrderOptions } from "@/features/custom-order/types/order";
import type { ImageRef } from "@yeongseon/shared";

import type {
  DbImageRef,
  CreateCustomOrderOptionsDto,
  CreateCustomOrderOptionsDtoSnakeCase,
  CreateCustomOrderRequest,
  CreateCustomOrderRequestDto,
} from "@/features/custom-order/types/dto/custom-order-input";

type OrderOptionsForCreateCustomOrderOptions = Omit<OrderOptions, "referenceImages" | "additionalNotes" | "sample" | "sampleType">;
const isAllowed = <T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T => typeof value === "string" && allowed.some((candidate) => candidate === value);

const normalizeEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[]
): T | null => (isAllowed(value, allowed) ? value : null);

const normalizeBoolean = (value: unknown): boolean => value === true;

const normalizeNumber = (value: unknown, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
};

const normalizeReferenceImages = (images: ImageRef[]): ImageRef[] => {
  const seen = new Set<string>();
  const normalized: ImageRef[] = [];

  for (const image of images) {
    const url = (image.url ?? "").trim();
    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);
    normalized.push({
      url,
      fileId: image.fileId ? image.fileId.trim() : "",
    });
  }

  return normalized;
};

const toDbImageRef = (image: ImageRef): DbImageRef => ({
  url: image.url,
  file_id: image.fileId,
});

export const toCreateCustomOrderOptionsInput = (
  options: OrderOptionsForCreateCustomOrderOptions
): CreateCustomOrderOptionsDto => ({
  fabricProvided: normalizeBoolean(options.fabricProvided),
  reorder: normalizeBoolean(options.reorder),
  fabricType: normalizeEnum(options.fabricType, ["SILK", "POLY"]),
  designType: normalizeEnum(options.designType, ["PRINTING", "YARN_DYED"]),
  tieType: normalizeEnum(options.tieType, ["MANUAL", "AUTO"]),
  interlining: normalizeEnum(options.interlining, ["POLY", "WOOL"]),
  interliningThickness: normalizeEnum(options.interliningThickness, [
    "THICK",
    "THIN",
  ]),
  sizeType: normalizeEnum(options.sizeType, ["ADULT", "CHILD"]),
  tieWidth: normalizeNumber(options.tieWidth, 8),
  triangleStitch: normalizeBoolean(options.triangleStitch),
  sideStitch: normalizeBoolean(options.sideStitch),
  barTack: normalizeBoolean(options.barTack),
  fold7: normalizeBoolean(options.fold7),
  dimple: normalizeBoolean(options.dimple),
  spoderato: normalizeBoolean(options.spoderato),
  brandLabel: normalizeBoolean(options.brandLabel),
  careLabel: normalizeBoolean(options.careLabel),
});

interface ToCreateCustomOrderRequestInput {
  shippingAddressId: string;
  options: OrderOptionsForCreateCustomOrderOptions;
  referenceImages: ImageRef[];
  additionalNotes: string;
  sample: boolean;
  sampleType: "sewing" | "fabric" | "fabric_and_sewing" | null;
}

export const toCreateCustomOrderInput = (
  input: ToCreateCustomOrderRequestInput
): CreateCustomOrderRequest => ({
  shippingAddressId: input.shippingAddressId,
  options: toCreateCustomOrderOptionsInput(input.options),
  quantity: input.options.quantity,
  referenceImages: normalizeReferenceImages(input.referenceImages),
  additionalNotes: input.additionalNotes.trim(),
  sample: normalizeBoolean(input.sample),
  sampleType: normalizeEnum(input.sampleType, ["sewing", "fabric", "fabric_and_sewing"]),
});

export const toCreateCustomOrderInputDto = (
  request: CreateCustomOrderRequest
): CreateCustomOrderRequestDto => ({
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
  reference_images: request.referenceImages.map(toDbImageRef),
  additional_notes: request.additionalNotes,
  sample: request.sample,
  sample_type: request.sampleType,
});
