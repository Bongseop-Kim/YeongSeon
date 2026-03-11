import { supabase } from "@/lib/supabase";
import { isRecord } from "@/lib/type-guard";
import { toCreateQuoteRequestInputDto } from "@/features/quote-request/api/quote-request-mapper";
import type { CreateQuoteRequestRequest } from "@/features/quote-request/types/dto/quote-request-input";
import type {
  ContactMethod,
  QuoteRequestStatus,
} from "@yeongseon/shared";

export interface CreateQuoteRequestResponse {
  quoteRequestId: string;
  quoteNumber: string;
}

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

export interface QuoteRequestListItem {
  id: string;
  quoteNumber: string;
  date: string;
  status: QuoteRequestStatus;
  quantity: number;
  quotedAmount: number | null;
  contactName: string;
  contactMethod: ContactMethod;
}

export interface QuoteRequestOptions {
  tieType: string;
  interlining: string;
  designType: string;
  fabricType: string;
  fabricProvided: boolean;
  interliningThickness: string;
  triangleStitch: boolean;
  sideStitch: boolean;
  barTack: boolean;
  dimple: boolean;
  spoderato: boolean;
  fold7: boolean;
  brandLabel: boolean;
  careLabel: boolean;
}

export interface QuoteRequestDetail {
  id: string;
  quoteNumber: string;
  date: string;
  status: QuoteRequestStatus;
  quantity: number;
  options: QuoteRequestOptions;
  referenceImageUrls: string[];
  additionalNotes: string;
  contactName: string;
  contactTitle: string;
  contactMethod: ContactMethod;
  contactValue: string;
  quotedAmount: number | null;
  quoteConditions: string | null;
}

export type { CreateQuoteRequestRequest };

const isContactMethod = (value: unknown): value is ContactMethod =>
  value === "email" || value === "kakao" || value === "phone";

const isQuoteRequestStatus = (value: unknown): value is QuoteRequestStatus =>
  value === "요청" ||
  value === "견적발송" ||
  value === "협의중" ||
  value === "확정" ||
  value === "종료";

const parseQuoteRequestListRows = (data: unknown): QuoteRequestListRowDTO[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error("견적 요청 목록 응답이 올바르지 않습니다: 배열이 아닙니다.");
  }

  return data.map((row, index) => {
    if (!isRecord(row)) {
      throw new Error(`견적 요청 행(${index})이 올바르지 않습니다: 객체가 아닙니다.`);
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
        `견적 요청 행(${index})이 올바르지 않습니다: 필수 필드(id, quoteNumber, date, quantity, contactName, created_at) 누락.`
      );
    }

    if (!isQuoteRequestStatus(row.status)) {
      throw new Error(
        `견적 요청 행(${index})이 올바르지 않습니다: status 값(${String(row.status)})이 허용된 상태가 아닙니다.`
      );
    }

    if (!isContactMethod(row.contactMethod)) {
      throw new Error(
        `견적 요청 행(${index})이 올바르지 않습니다: contactMethod 값(${String(row.contactMethod)})이 허용된 값이 아닙니다.`
      );
    }

    if (row.quotedAmount !== null && typeof row.quotedAmount !== "number") {
      throw new Error(
        `견적 요청 행(${index})이 올바르지 않습니다: quotedAmount는 숫자 또는 null이어야 합니다.`
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

const toQuoteRequestListItem = (
  row: QuoteRequestListRowDTO
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

const toQuoteRequestOptions = (raw: Record<string, unknown>): QuoteRequestOptions => ({
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

const toReferenceImageUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((image) =>
      isRecord(image) && typeof image.url === "string" ? image.url : null
    )
    .filter((url): url is string => url !== null);
};

const parseQuoteRequestDetailRow = (
  data: unknown
): QuoteRequestDetailRowDTO | null => {
  if (data == null) return null;

  if (!isRecord(data)) {
    throw new Error("견적 요청 상세 응답이 올바르지 않습니다: 객체가 아닙니다.");
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
      "견적 요청 상세 응답이 올바르지 않습니다: 필수 필드가 누락되었습니다."
    );
  }

  if (!isQuoteRequestStatus(data.status)) {
    throw new Error(
      `견적 요청 상세 응답이 올바르지 않습니다: status 값(${String(data.status)})이 허용된 상태가 아닙니다.`
    );
  }

  if (!isContactMethod(data.contactMethod)) {
    throw new Error(
      `견적 요청 상세 응답이 올바르지 않습니다: contactMethod 값(${String(data.contactMethod)})이 허용된 값이 아닙니다.`
    );
  }

  if (!isRecord(data.options)) {
    throw new Error("견적 요청 상세 응답이 올바르지 않습니다: options가 객체가 아닙니다.");
  }

  if (data.quotedAmount !== null && typeof data.quotedAmount !== "number") {
    throw new Error(
      "견적 요청 상세 응답이 올바르지 않습니다: quotedAmount는 숫자 또는 null이어야 합니다."
    );
  }

  if (data.quoteConditions !== null && typeof data.quoteConditions !== "string") {
    throw new Error(
      "견적 요청 상세 응답이 올바르지 않습니다: quoteConditions는 문자열 또는 null이어야 합니다."
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

const toQuoteRequestDetail = (
  row: QuoteRequestDetailRowDTO
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

export const createQuoteRequest = async (
  request: CreateQuoteRequestRequest
): Promise<CreateQuoteRequestResponse> => {
  const requestDto = toCreateQuoteRequestInputDto(request);

  const { data, error } = await supabase.functions.invoke(
    "create-quote-request",
    {
      body: requestDto,
    }
  );

  if (error) {
    throw new Error(`견적요청 생성 실패: ${error.message}`);
  }

  if (!data) {
    throw new Error("견적요청 생성 결과를 받을 수 없습니다.");
  }

  return {
    quoteRequestId: data.quote_request_id,
    quoteNumber: data.quote_number,
  };
};

export const getQuoteRequests = async (): Promise<QuoteRequestListItem[]> => {
  const { data, error } = await supabase
    .from("quote_request_list_view")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    throw new Error("견적 요청 목록을 불러오는 데 실패했습니다.");
  }

  return parseQuoteRequestListRows(data).map(toQuoteRequestListItem);
};

export const getQuoteRequest = async (
  id: string
): Promise<QuoteRequestDetail | null> => {
  const { data, error } = await supabase
    .from("quote_request_detail_view")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new Error("견적 요청 상세를 불러오는 데 실패했습니다.");
  }

  const row = parseQuoteRequestDetailRow(data);
  return row ? toQuoteRequestDetail(row) : null;
};
