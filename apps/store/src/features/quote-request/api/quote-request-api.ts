import { supabase } from "@/lib/supabase";
import { toCreateQuoteRequestInputDto } from "@/features/quote-request/api/quote-request-mapper";
import type { CreateQuoteRequestRequest } from "@/features/quote-request/types/dto/quote-request-input";

export interface CreateQuoteRequestResponse {
  quoteRequestId: string;
  quoteNumber: string;
}

export type { CreateQuoteRequestRequest };

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
