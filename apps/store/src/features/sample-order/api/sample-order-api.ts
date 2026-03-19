import { supabase } from "@/lib/supabase";
import { toCreateSampleOrderInputDto } from "@/features/sample-order/api/sample-order-mapper";
import type { CreateSampleOrderRequest } from "@/features/sample-order/types/sample-order-input";

export interface CreateSampleOrderResponse {
  orderId: string;
  orderNumber: string;
}

export const createSampleOrder = async (
  request: CreateSampleOrderRequest,
): Promise<CreateSampleOrderResponse> => {
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

  return {
    orderId: data.order_id,
    orderNumber: data.order_number,
  };
};
