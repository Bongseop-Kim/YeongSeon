import { supabase } from "@/lib/supabase";
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

export type { CreateQuoteRequestRequest };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
