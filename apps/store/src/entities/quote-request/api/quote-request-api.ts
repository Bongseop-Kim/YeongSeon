import { supabase } from "@/shared/lib/supabase";
import {
  parseQuoteRequestDetailRow,
  parseQuoteRequestListRows,
  toCreateQuoteRequestInputDto,
  toQuoteRequestDetail,
  toQuoteRequestListItem,
} from "@/entities/quote-request/api/quote-request-mapper";
import type { CreateQuoteRequestRequest } from "@/entities/quote-request/model/dto/quote-request-input";
import type {
  QuoteRequestDetail,
  QuoteRequestListItem,
} from "@yeongseon/shared";

interface CreateQuoteRequestResponse {
  quoteRequestId: string;
  quoteNumber: string;
}

export type { CreateQuoteRequestRequest };

const QUOTE_REQUEST_LIST_SELECT_COLUMNS = [
  "id",
  '"quoteNumber"',
  "date",
  "status",
  "quantity",
  '"quotedAmount"',
  '"contactName"',
  '"contactMethod"',
  "created_at",
].join(", ");
const QUOTE_REQUEST_DETAIL_SELECT_COLUMNS = [
  "id",
  '"quoteNumber"',
  "date",
  "status",
  "options",
  "quantity",
  '"referenceImages"',
  '"additionalNotes"',
  '"contactName"',
  '"contactTitle"',
  '"contactMethod"',
  '"contactValue"',
  '"quotedAmount"',
  '"quoteConditions"',
  "created_at",
].join(", ");

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
    .select(QUOTE_REQUEST_LIST_SELECT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);

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
    .select(QUOTE_REQUEST_DETAIL_SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new Error("견적 요청 상세를 불러오는 데 실패했습니다.");
  }

  const row = parseQuoteRequestDetailRow(data);
  return row ? toQuoteRequestDetail(row) : null;
};
