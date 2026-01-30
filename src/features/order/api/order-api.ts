import { supabase } from "@/lib/supabase";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
} from "@/features/order/types/view/order-input";
import type { CreateOrderInputDTO } from "@/features/order/types/dto/order-input";
import type { CreateOrderResultDTO } from "@/features/order/types/dto/order-output";
import type { OrderViewDTO } from "@/features/order/types/dto/order-view";
import type { Order } from "@/features/order/types/view/order";
import { toOrderItemInputDTO, toOrderView } from "@/features/order/api/order-mapper";

/**
 * 주문 생성
 */
export const createOrder = async (
  request: CreateOrderRequest
): Promise<CreateOrderResponse> => {

  const input: CreateOrderInputDTO = {
    shipping_address_id: request.shippingAddressId,
    items: request.items.map(toOrderItemInputDTO),
  };

  const { data: orderResult, error: orderError } =
    await supabase.functions.invoke("create-order", {
      body: input,
    });

  if (orderError) {
    throw new Error(`주문 생성 실패: ${orderError.message}`);
  }

  if (!orderResult) {
    throw new Error("주문 생성 결과를 받을 수 없습니다.");
  }

  const result = orderResult as CreateOrderResultDTO;

  return {
    orderId: result.order_id,
    orderNumber: result.order_number,
  };
};


/**
 * 주문 목록 조회
 */
export const getOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase.rpc("get_orders");

  if (error) {
    throw new Error(`주문 목록 조회 실패: ${error.message}`);
  }

  const records = (data as OrderViewDTO[] | null) ?? [];
  return records.map((record) => toOrderView(record));
};

/**
 * 주문 상세 조회
 */
export const getOrder = async (orderId: string): Promise<Order | null> => {
  const { data, error } = await supabase.rpc("get_order", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(`주문 조회 실패: ${error.message}`);
  }

  const record = (data as OrderViewDTO | null) ?? null;
  return record ? toOrderView(record) : null;
};
