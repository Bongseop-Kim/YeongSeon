import { supabase } from "@/shared/lib/supabase";
import {
  parseSampleOrderResponse,
  toCreateSampleOrderInput,
  toCreateSampleOrderInputDto,
  type CreateSampleOrderFormInput,
} from "@/features/sample-order/api/sample-order-mapper";

interface CreateSampleOrderResponse {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
}

export const createSampleOrder = async (
  input: CreateSampleOrderFormInput,
): Promise<CreateSampleOrderResponse> => {
  const request = toCreateSampleOrderInput(input);
  const requestDto = toCreateSampleOrderInputDto(request);

  const { data, error } = await supabase.functions.invoke(
    "create-sample-order",
    {
      body: requestDto,
    },
  );

  if (error) {
    const detail =
      typeof data === "object" && data?.error
        ? String(data.error)
        : error.message;
    throw new Error(`샘플 주문 생성 실패: ${detail}`);
  }

  if (!data) {
    throw new Error("샘플 주문 생성 결과를 받을 수 없습니다.");
  }

  if (data.error) {
    throw new Error(`샘플 주문 생성 실패: ${data.error}`);
  }

  return parseSampleOrderResponse(data);
};
