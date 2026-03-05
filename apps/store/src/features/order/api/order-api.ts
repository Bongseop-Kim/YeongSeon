import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
} from "@/features/order/types/view/order-input";
import type { CreateOrderInputDTO } from "@yeongseon/shared/types/dto/order-input";
import type { OrderViewDTO } from "@yeongseon/shared/types/dto/order-view";
import type { Order } from "@yeongseon/shared/types/view/order";
import {
  fromOrderItemRowDTO,
  parseConfirmPurchaseResponse,
  parseCreateOrderResult,
  parseOrderListRows,
  parseOrderItemRows,
  parseOrderDetailRow,
  toOrderItemInputDTO,
  toOrderView,
  toOrderViewFromDetail,
} from "@/features/order/api/order-mapper";
import { normalizeKeyword, type ListFilters } from "@/features/order/utils/list-filters";

const ORDER_LIST_VIEW = "order_list_view";
const ORDER_DETAIL_VIEW = "order_detail_view";
const ORDER_ITEM_VIEW = "order_item_view";

const extractEdgeFunctionErrorMessage = async (
  error: unknown,
): Promise<string | null> => {
  if (!(error instanceof FunctionsHttpError)) {
    return null;
  }

  try {
    const payload = await error.context.json();
    if (payload && typeof payload === "object" && "error" in payload) {
      const message = payload.error;
      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
    }
  } catch {
    return null;
  }

  return null;
};

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
    const message =
      (await extractEdgeFunctionErrorMessage(orderError)) ??
      "주문 생성에 실패했습니다.";
    throw new Error(message);
  }

  if (!orderResult) {
    throw new Error("주문 생성 결과를 받을 수 없습니다.");
  }

  const result = parseCreateOrderResult(orderResult);

  return {
    orderId: result.order_id,
    orderNumber: result.order_number,
  };
};


/**
 * 주문 목록 조회
 */
export const getOrders = async (filters?: ListFilters): Promise<Order[]> => {
  let query = supabase
    .from(ORDER_LIST_VIEW)
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.dateFrom) {
    query = query.gte("date", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("date", filters.dateTo);
  }

  const { data: orders, error: ordersError } = await query;

  if (ordersError) {
    throw new Error("주문 목록을 불러오는 데 실패했습니다.");
  }

  const orderRows = parseOrderListRows(orders);
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
    throw new Error("주문 목록을 불러오는 데 실패했습니다.");
  }

  const itemRows = parseOrderItemRows(items);
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

  const views = records.map(toOrderView);
  const keyword = normalizeKeyword(filters?.keyword);
  if (!keyword) {
    return views;
  }

  return views.filter((order) => {
    const itemText = order.items
      .map((item) => {
        if (item.type === "product") {
          return `${item.product.name} ${item.selectedOption?.name ?? ""}`;
        }
        return "수선";
      })
      .join(" ");

    const searchText = `${order.orderNumber} ${order.status} ${itemText}`.toLowerCase();
    return searchText.includes(keyword);
  });
};

/**
 * 구매확정 (배송완료 상태에서만 가능, 2% 포인트 적립)
 */
export const confirmPurchase = async (
  orderId: string
): Promise<{ pointsEarned: number }> => {
  const { data, error } = await supabase.rpc("customer_confirm_purchase", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(`구매확정 실패: ${error.message}`);
  }

  return parseConfirmPurchaseResponse(data);
};

/**
 * 주문 상세 조회
 */
export const getOrder = async (orderId: string): Promise<Order | null> => {
  const { data: order, error: orderError } = await supabase
    .from(ORDER_DETAIL_VIEW)
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    throw new Error("주문을 불러오는 데 실패했습니다.");
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
    throw new Error("주문을 불러오는 데 실패했습니다.");
  }

  const itemRows = parseOrderItemRows(items);
  const mappedItems: OrderViewDTO["items"] = itemRows.map(fromOrderItemRowDTO);

  const detailRow = parseOrderDetailRow(order);
  return toOrderViewFromDetail(detailRow, mappedItems);
};
