import { supabase } from "@/lib/supabase";
import { toCreateCustomOrderRequestDto } from "@/features/custom-order/api/custom-order-mapper";
import type { CreateCustomOrderRequest } from "@/features/custom-order/types/dto/custom-order-input";

export interface CreateCustomOrderResponse {
  orderId: string;
  orderNumber: string;
}

export type { CreateCustomOrderRequest };

export const createCustomOrder = async (
  request: CreateCustomOrderRequest
): Promise<CreateCustomOrderResponse> => {
  const requestDto = toCreateCustomOrderRequestDto(request);

  const { data, error } = await supabase.functions.invoke(
    "create-custom-order",
    {
      body: requestDto,
    }
  );

  if (error) {
    throw new Error(`주문제작 생성 실패: ${error.message}`);
  }

  if (!data) {
    throw new Error("주문제작 생성 결과를 받을 수 없습니다.");
  }

  return {
    orderId: data.order_id,
    orderNumber: data.order_number,
  };
};
