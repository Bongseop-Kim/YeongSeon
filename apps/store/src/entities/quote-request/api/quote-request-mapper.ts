import type { OrderOptions } from "@/entities/custom-order";
import { isRecord } from "@/shared/lib/type-guard";
import type { ImageRef } from "@yeongseon/shared";
import { normalizeReferenceImages, toDbImageRef } from "@yeongseon/shared";
import {
  toCreateCustomOrderOptionsInput,
  toCustomOrderOptionsDtoSnakeCase,
} from "@/entities/custom-order";
import type {
  CreateQuoteRequestRequest,
  CreateQuoteRequestRequestDto,
} from "@/entities/quote-request/model/dto/quote-request-input";
import type {
  ContactMethod,
  QuoteRequestDetail,
  QuoteRequestListItem,
  QuoteRequestOptions,
  QuoteRequestStatus,
} from "@yeongseon/shared";

type OrderOptionsForMapping = Omit<
  OrderOptions,
  "referenceImages" | "additionalNotes" | "sample" | "sampleType"
>;

interface ToCreateQuoteRequestInput {
  shippingAddressId: string;
  options: OrderOptionsForMapping;
  referenceImages: ImageRef[];
  additionalNotes: string;
  contactName: string;
  contactTitle: string;
  contactMethod: "email" | "kakao" | "phone";
  contactValue: string;
}

export const toCreateQuoteRequestInput = (
  input: ToCreateQuoteRequestInput,
): CreateQuoteRequestRequest => ({
  shippingAddressId: input.shippingAddressId,
  options: toCreateCustomOrderOptionsInput(input.options),
  quantity: input.options.quantity,
  referenceImages: normalizeReferenceImages(input.referenceImages),
  additionalNotes: input.additionalNotes.trim(),
  contactName: input.contactName.trim(),
  contactTitle: input.contactTitle.trim(),
  contactMethod: input.contactMethod,
  contactValue: input.contactValue.trim(),
});

export const toCreateQuoteRequestInputDto = (
  request: CreateQuoteRequestRequest,
): CreateQuoteRequestRequestDto => ({
  shipping_address_id: request.shippingAddressId,
  options: toCustomOrderOptionsDtoSnakeCase(request.options),
  quantity: request.quantity,
  reference_images: request.referenceImages.map(toDbImageRef),
  additional_notes: request.additionalNotes,
  contact_name: request.contactName,
  contact_title: request.contactTitle,
  contact_method: request.contactMethod,
  contact_value: request.contactValue,
});

interface QuoteRequestListRowDTO {
  id: string;
  quoteNumber: string;
  date: string;
  status: QuoteRequestStatus;
  quantity: number;
  quotedAmount: number | null;
  contactName: string;
  contactMethod: ContactMethod;
  created_at: string;
}

interface QuoteRequestDetailRowDTO {
  id: string;
  quoteNumber: string;
  date: string;
  status: QuoteRequestStatus;
  quantity: number;
  options: Record<string, unknown>;
  referenceImages: unknown;
  additionalNotes: string;
  contactName: string;
  contactTitle: string;
  contactMethod: ContactMethod;
  contactValue: string;
  quotedAmount: number | null;
  quoteConditions: string | null;
}

const isContactMethod = (value: unknown): value is ContactMethod =>
  value === "email" || value === "kakao" || value === "phone";

const isQuoteRequestStatus = (value: unknown): value is QuoteRequestStatus =>
  value === "요청" ||
  value === "견적발송" ||
  value === "협의중" ||
  value === "확정" ||
  value === "종료";

export const parseQuoteRequestListRows = (
  data: unknown,
): QuoteRequestListRowDTO[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error(
      "견적 요청 목록 응답이 올바르지 않습니다: 배열이 아닙니다.",
    );
  }

  return data.map((row, index) => {
    if (!isRecord(row)) {
      throw new Error(
        `견적 요청 행(${index})이 올바르지 않습니다: 객체가 아닙니다.`,
      );
    }

    if (
      typeof row.id !== "string" ||
      typeof row.quoteNumber !== "string" ||
      typeof row.date !== "string" ||
      typeof row.quantity !== "number" ||
      typeof row.contactName !== "string" ||
      typeof row.created_at !== "string"
    ) {
      throw new Error(
        `견적 요청 행(${index})이 올바르지 않습니다: 필수 필드(id, quoteNumber, date, quantity, contactName, created_at) 누락.`,
      );
    }

    if (!isQuoteRequestStatus(row.status)) {
      throw new Error(
        `견적 요청 행(${index})이 올바르지 않습니다: status 값(${String(row.status)})이 허용된 상태가 아닙니다.`,
      );
    }

    if (!isContactMethod(row.contactMethod)) {
      throw new Error(
        `견적 요청 행(${index})이 올바르지 않습니다: contactMethod 값(${String(row.contactMethod)})이 허용된 값이 아닙니다.`,
      );
    }

    if (row.quotedAmount !== null && typeof row.quotedAmount !== "number") {
      throw new Error(
        `견적 요청 행(${index})이 올바르지 않습니다: quotedAmount는 숫자 또는 null이어야 합니다.`,
      );
    }

    return {
      id: row.id,
      quoteNumber: row.quoteNumber,
      date: row.date,
      status: row.status,
      quantity: row.quantity,
      quotedAmount: row.quotedAmount,
      contactName: row.contactName,
      contactMethod: row.contactMethod,
      created_at: row.created_at,
    };
  });
};

export const toQuoteRequestListItem = (
  row: QuoteRequestListRowDTO,
): QuoteRequestListItem => ({
  id: row.id,
  quoteNumber: row.quoteNumber,
  date: row.date,
  status: row.status,
  quantity: row.quantity,
  quotedAmount: row.quotedAmount,
  contactName: row.contactName,
  contactMethod: row.contactMethod,
});

export const toQuoteRequestOptions = (
  raw: Record<string, unknown>,
): QuoteRequestOptions => ({
  tieType: typeof raw.tie_type === "string" ? raw.tie_type : "",
  interlining: typeof raw.interlining === "string" ? raw.interlining : "",
  designType: typeof raw.design_type === "string" ? raw.design_type : "",
  fabricType: typeof raw.fabric_type === "string" ? raw.fabric_type : "",
  fabricProvided: raw.fabric_provided === true,
  interliningThickness:
    typeof raw.interlining_thickness === "string"
      ? raw.interlining_thickness
      : "",
  triangleStitch: raw.triangle_stitch === true,
  sideStitch: raw.side_stitch === true,
  barTack: raw.bar_tack === true,
  dimple: raw.dimple === true,
  spoderato: raw.spoderato === true,
  fold7: raw.fold7 === true,
  brandLabel: raw.brand_label === true,
  careLabel: raw.care_label === true,
});

export const toReferenceImageUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((image) =>
      isRecord(image) && typeof image.url === "string" ? image.url : null,
    )
    .filter((url): url is string => url !== null);
};

export const parseQuoteRequestDetailRow = (
  data: unknown,
): QuoteRequestDetailRowDTO | null => {
  if (data == null) return null;

  if (!isRecord(data)) {
    throw new Error(
      "견적 요청 상세 응답이 올바르지 않습니다: 객체가 아닙니다.",
    );
  }

  if (
    typeof data.id !== "string" ||
    typeof data.quoteNumber !== "string" ||
    typeof data.date !== "string" ||
    typeof data.quantity !== "number" ||
    typeof data.additionalNotes !== "string" ||
    typeof data.contactName !== "string" ||
    typeof data.contactTitle !== "string" ||
    typeof data.contactValue !== "string"
  ) {
    throw new Error(
      "견적 요청 상세 응답이 올바르지 않습니다: 필수 필드가 누락되었습니다.",
    );
  }

  if (!isQuoteRequestStatus(data.status)) {
    throw new Error(
      `견적 요청 상세 응답이 올바르지 않습니다: status 값(${String(data.status)})이 허용된 상태가 아닙니다.`,
    );
  }

  if (!isContactMethod(data.contactMethod)) {
    throw new Error(
      `견적 요청 상세 응답이 올바르지 않습니다: contactMethod 값(${String(data.contactMethod)})이 허용된 값이 아닙니다.`,
    );
  }

  if (!isRecord(data.options)) {
    throw new Error(
      "견적 요청 상세 응답이 올바르지 않습니다: options가 객체가 아닙니다.",
    );
  }

  if (data.quotedAmount !== null && typeof data.quotedAmount !== "number") {
    throw new Error(
      "견적 요청 상세 응답이 올바르지 않습니다: quotedAmount는 숫자 또는 null이어야 합니다.",
    );
  }

  if (
    data.quoteConditions !== null &&
    typeof data.quoteConditions !== "string"
  ) {
    throw new Error(
      "견적 요청 상세 응답이 올바르지 않습니다: quoteConditions는 문자열 또는 null이어야 합니다.",
    );
  }

  return {
    id: data.id,
    quoteNumber: data.quoteNumber,
    date: data.date,
    status: data.status,
    quantity: data.quantity,
    options: data.options,
    referenceImages: data.referenceImages,
    additionalNotes: data.additionalNotes,
    contactName: data.contactName,
    contactTitle: data.contactTitle,
    contactMethod: data.contactMethod,
    contactValue: data.contactValue,
    quotedAmount: data.quotedAmount,
    quoteConditions: data.quoteConditions,
  };
};

export const toQuoteRequestDetail = (
  row: QuoteRequestDetailRowDTO,
): QuoteRequestDetail => ({
  id: row.id,
  quoteNumber: row.quoteNumber,
  date: row.date,
  status: row.status,
  quantity: row.quantity,
  options: toQuoteRequestOptions(row.options),
  referenceImageUrls: toReferenceImageUrls(row.referenceImages),
  additionalNotes: row.additionalNotes,
  contactName: row.contactName,
  contactTitle: row.contactTitle,
  contactMethod: row.contactMethod,
  contactValue: row.contactValue,
  quotedAmount: row.quotedAmount,
  quoteConditions: row.quoteConditions,
});
