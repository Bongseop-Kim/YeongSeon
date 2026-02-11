import { supabase } from "@/lib/supabase";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
} from "@/features/order/types/view/order-input";
import type { CreateOrderInputDTO } from "@/features/order/types/dto/order-input";
import type { CreateOrderResultDTO } from "@/features/order/types/dto/order-output";
import type {
  OrderItemRowDTO,
  OrderListRowDTO,
  OrderViewDTO,
} from "@/features/order/types/dto/order-view";
import type { Order } from "@/features/order/types/view/order";
import {
  fromOrderItemRowDTO,
  toOrderItemInputDTO,
  toOrderView,
} from "@/features/order/api/order-mapper";

const ORDER_LIST_VIEW = "order_list_view";
const ORDER_ITEM_VIEW = "order_item_view";

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
  const { data: orders, error: ordersError } = await supabase
    .from(ORDER_LIST_VIEW)
    .select("*")
    .order("created_at", { ascending: false });

  if (ordersError) {
    throw new Error(`주문 목록 조회 실패: ${ordersError.message}`);
  }

  const orderRows = (orders as OrderListRowDTO[] | null) ?? [];
  if (orderRows.length === 0) {
    return [];
  }

  const orderIds = orderRows.map((row) => row.id);
  const { data: items, error: itemsError } = await supabase
    .from(ORDER_ITEM_VIEW)
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(`주문 상품 조회 실패: ${itemsError.message}`);
  }

  const itemRows = (items as OrderItemRowDTO[] | null) ?? [];
  const itemsByOrderId = new Map<string, OrderViewDTO["items"]>();

  for (const item of itemRows) {
    const current = itemsByOrderId.get(item.order_id) ?? [];
    current.push(fromOrderItemRowDTO(item));
    itemsByOrderId.set(item.order_id, current);
  }

  const records: OrderViewDTO[] = orderRows.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    date: order.date,
    status: order.status,
    items: itemsByOrderId.get(order.id) ?? [],
    totalPrice: order.totalPrice,
  }));

  return records.map(toOrderView);
};

/**
 * 주문 상세 조회
 */
export const getOrder = async (orderId: string): Promise<Order | null> => {
  const { data: order, error: orderError } = await supabase
    .from(ORDER_LIST_VIEW)
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw new Error(`주문 조회 실패: ${orderError.message}`);
  }

  if (!order) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from(ORDER_ITEM_VIEW)
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(`주문 상품 조회 실패: ${itemsError.message}`);
  }

  const itemRows = (items as OrderItemRowDTO[] | null) ?? [];
  const mappedItems: OrderViewDTO["items"] = itemRows.map(fromOrderItemRowDTO);

  const orderRow = order as OrderListRowDTO;
  const record: OrderViewDTO = {
    id: orderRow.id,
    orderNumber: orderRow.orderNumber,
    date: orderRow.date,
    status: orderRow.status,
    items: mappedItems,
    totalPrice: orderRow.totalPrice,
  };

  return toOrderView(record);
};
