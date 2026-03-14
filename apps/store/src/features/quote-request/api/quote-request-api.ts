import { supabase } from "@/lib/supabase";
import {
  parseQuoteRequestDetailRow,
  parseQuoteRequestListRows,
  toCreateQuoteRequestInputDto,
  toQuoteRequestDetail,
  toQuoteRequestListItem,
} from "@/features/quote-request/api/quote-request-mapper";
import type { CreateQuoteRequestRequest } from "@/features/quote-request/types/dto/quote-request-input";
import type {
  QuoteRequestDetail,
  QuoteRequestListItem,
} from "@yeongseon/shared";

export interface CreateQuoteRequestResponse {
  quoteRequestId: string;
  quoteNumber: string;
}

export type { CreateQuoteRequestRequest };
export type {
  QuoteRequestDetail,
  QuoteRequestListItem,
} from "@yeongseon/shared";

export const createQuoteRequest = async (
  request: CreateQuoteRequestRequest,
): Promise<CreateQuoteRequestResponse> => {
  const requestDto = toCreateQuoteRequestInputDto(request);

  const { data, error } = await supabase.functions.invoke(
    "create-quote-request",
    {
      body: requestDto,
    },
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
  id: string,
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
