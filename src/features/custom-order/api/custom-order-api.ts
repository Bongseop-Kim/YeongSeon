import { supabase } from "@/lib/supabase";
import type { OrderOptions } from "@/features/custom-order/types/order";

export interface CreateCustomOrderRequest {
  shippingAddressId: string;
  options: OrderOptions;
  quantity: number;
  referenceImageUrls: string[];
  additionalNotes: string;
  sample: boolean;
}

export interface CreateCustomOrderResponse {
  orderId: string;
  orderNumber: string;
}

export const createCustomOrder = async (
  request: CreateCustomOrderRequest
): Promise<CreateCustomOrderResponse> => {
  const { data, error } = await supabase.functions.invoke(
    "create-custom-order",
    {
      body: {
        shipping_address_id: request.shippingAddressId,
        options: request.options,
        quantity: request.quantity,
        reference_image_urls: request.referenceImageUrls,
        additional_notes: request.additionalNotes,
        sample: request.sample,
      },
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
