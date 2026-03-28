import { supabase } from "@/lib/supabase";
import {
  parseCreateCustomOrderResponse,
  toCreateCustomOrderInput,
  toCreateCustomOrderInputDto,
  type CreateCustomOrderFormInput,
} from "@/features/custom-order/api/custom-order-mapper";

interface CreateCustomOrderResponse {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
}

export type { CreateCustomOrderFormInput };

export const createCustomOrder = async (
  input: CreateCustomOrderFormInput,
): Promise<CreateCustomOrderResponse> => {
  const request = toCreateCustomOrderInput(input);
  const requestDto = toCreateCustomOrderInputDto(request);

  const { data, error } = await supabase.functions.invoke(
    "create-custom-order",
    {
      body: requestDto,
    },
  );

  if (error) {
    const detail =
      typeof data === "object" && data?.error
        ? String(data.error)
        : error.message;
    throw new Error(`주문제작 생성 실패: ${detail}`);
  }

  if (!data) {
    throw new Error("주문제작 생성 결과를 받을 수 없습니다.");
  }

  if (data.error) {
    throw new Error(`주문제작 생성 실패: ${data.error}`);
  }

  return parseCreateCustomOrderResponse(data);
};
