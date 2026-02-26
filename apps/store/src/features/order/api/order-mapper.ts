import type { CreateOrderRequest } from "@/features/order/types/view/order-input";
import type { CreateOrderInputDTO } from "@yeongseon/shared/types/dto/order-input";
import type {
  OrderItemRowDTO,
  OrderItemDTO,
  OrderViewDTO,
  OrderListRowDTO,
  OrderDetailRowDTO,
} from "@yeongseon/shared/types/dto/order-view";
import type { CreateOrderResultDTO } from "@yeongseon/shared/types/dto/order-output";
import type { Order } from "@yeongseon/shared/types/view/order";
import {
  normalizeItemRow,
  toOrderItemView,
} from "@yeongseon/shared/mappers/shared-mapper";

export const toOrderItemInputDTO = (
  item: CreateOrderRequest["items"][number]
): CreateOrderInputDTO["items"][number] => {
  const baseRecord = {
    item_id: item.id,
    quantity: item.quantity,
    applied_user_coupon_id: item.appliedCoupon?.id ?? item.appliedCouponId ?? null,
  };

  if (item.type === "product") {
    return {
      ...baseRecord,
      item_type: "product",
      product_id: item.product.id,
      selected_option_id: item.selectedOption?.id || null,
      reform_data: null,
    };
  }

  return {
    ...baseRecord,
    item_type: "reform",
    product_id: null,
    selected_option_id: null,
    reform_data:
      item.reformData &&
      item.reformData.tie &&
      typeof item.reformData.tie === "object"
        ? {
            tie: {
              ...item.reformData.tie,
              image:
                typeof item.reformData.tie.image === "string"
                  ? item.reformData.tie.image
                  : undefined,
            },
            cost: item.reformData.cost,
          }
        : null,
  };
};

export const toOrderView = (order: OrderViewDTO): Order => ({
  ...order,
  items: order.items.map(toOrderItemView),
  shippingInfo: null,
  trackingInfo: null,
});

export const toOrderViewFromDetail = (
  detail: OrderDetailRowDTO,
  items: OrderItemDTO[],
): Order => ({
  id: detail.id,
  orderNumber: detail.orderNumber,
  date: detail.date,
  status: detail.status,
  totalPrice: detail.totalPrice,
  items: items.map(toOrderItemView),
  shippingInfo: detail.recipientName
    ? {
        recipientName: detail.recipientName,
        recipientPhone: detail.recipientPhone ?? "",
        address: detail.shippingAddress ?? "",
        addressDetail: detail.shippingAddressDetail ?? null,
        postalCode: detail.shippingPostalCode ?? "",
        deliveryMemo: detail.deliveryMemo ?? null,
        deliveryRequest: detail.deliveryRequest ?? null,
      }
    : null,
  trackingInfo:
    detail.courierCompany && detail.trackingNumber
      ? {
          courierCompany: detail.courierCompany,
          trackingNumber: detail.trackingNumber,
          shippedAt: detail.shippedAt ?? null,
        }
      : null,
});

// ── parse helpers (런타임 검증) ──────────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export const parseCreateOrderResult = (
  data: unknown
): CreateOrderResultDTO => {
  if (!isRecord(data)) {
    throw new Error("주문 생성 응답이 올바르지 않습니다: 객체가 아닙니다.");
  }
  if (
    typeof data.order_id !== "string" ||
    typeof data.order_number !== "string"
  ) {
    throw new Error(
      "주문 생성 응답이 올바르지 않습니다: order_id 또는 order_number 누락."
    );
  }
  return { order_id: data.order_id, order_number: data.order_number };
};

export const parseOrderListRows = (data: unknown): OrderListRowDTO[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error("주문 목록 응답이 올바르지 않습니다: 배열이 아닙니다.");
  }
  for (let i = 0; i < data.length; i++) {
    const row: unknown = data[i];
    if (
      !isRecord(row) ||
      typeof row.id !== "string" ||
      typeof row.orderNumber !== "string"
    ) {
      throw new Error(
        `주문 목록 행(${i})이 올바르지 않습니다: 필수 필드(id, orderNumber) 누락.`
      );
    }
  }
  return data as OrderListRowDTO[];
};

export const parseOrderItemRows = (data: unknown): OrderItemRowDTO[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error("주문 상품 응답이 올바르지 않습니다: 배열이 아닙니다.");
  }
  for (let i = 0; i < data.length; i++) {
    const row: unknown = data[i];
    if (
      !isRecord(row) ||
      typeof row.id !== "string" ||
      typeof row.order_id !== "string"
    ) {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: 필수 필드(id, order_id) 누락.`
      );
    }
    if (row.type !== "product" && row.type !== "reform") {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: type이 "product" 또는 "reform"이 아닙니다.`
      );
    }
  }
  return data as OrderItemRowDTO[];
};

export const parseOrderDetailRow = (data: unknown): OrderDetailRowDTO => {
  if (!isRecord(data)) {
    throw new Error("주문 상세 응답이 올바르지 않습니다: 객체가 아닙니다.");
  }
  if (
    typeof data.id !== "string" ||
    typeof data.orderNumber !== "string"
  ) {
    throw new Error(
      "주문 상세 응답이 올바르지 않습니다: 필수 필드(id, orderNumber) 누락."
    );
  }
  return data as OrderDetailRowDTO;
};

// ── row → DTO 변환 ──────────────────────────────────

export const fromOrderItemRowDTO = (item: OrderItemRowDTO): OrderItemDTO =>
  normalizeItemRow(item);
