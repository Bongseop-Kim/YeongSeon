import type { CreateOrderRequest } from "@/features/order/types/view/order-input";
import type { CreateOrderInputDTO } from "@yeongseon/shared/types/dto/order-input";
import type {
  OrderItemRowDTO,
  OrderItemDTO,
  OrderViewDTO,
  OrderListRowDTO,
  OrderDetailRowDTO,
  OrderStatusDTO,
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

const ORDER_STATUSES: ReadonlySet<string> = new Set([
  "진행중", "완료", "배송중", "대기중", "취소",
]);
const isOrderStatus = (v: string): v is OrderStatusDTO =>
  ORDER_STATUSES.has(v);

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
  return data.map((row: unknown, i: number): OrderListRowDTO => {
    if (!isRecord(row)) {
      throw new Error(`주문 목록 행(${i})이 올바르지 않습니다: 객체가 아닙니다.`);
    }
    if (
      typeof row.id !== "string" ||
      typeof row.orderNumber !== "string" ||
      typeof row.date !== "string" ||
      typeof row.status !== "string" ||
      typeof row.totalPrice !== "number" ||
      typeof row.created_at !== "string"
    ) {
      throw new Error(
        `주문 목록 행(${i})이 올바르지 않습니다: 필수 필드(id, orderNumber, date, status, totalPrice, created_at) 누락.`
      );
    }
    if (!isOrderStatus(row.status)) {
      throw new Error(
        `주문 목록 행(${i})이 올바르지 않습니다: status 값(${row.status})이 허용된 상태가 아닙니다.`
      );
    }
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      date: row.date,
      status: row.status,
      totalPrice: row.totalPrice,
      created_at: row.created_at,
    };
  });
};

export const parseOrderItemRows = (data: unknown): OrderItemRowDTO[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error("주문 상품 응답이 올바르지 않습니다: 배열이 아닙니다.");
  }
  return data.map((row: unknown, i: number): OrderItemRowDTO => {
    if (!isRecord(row)) {
      throw new Error(`주문 상품 행(${i})이 올바르지 않습니다: 객체가 아닙니다.`);
    }
    if (
      typeof row.id !== "string" ||
      typeof row.order_id !== "string" ||
      typeof row.quantity !== "number" ||
      typeof row.created_at !== "string"
    ) {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: 필수 필드(id, order_id, quantity, created_at) 누락.`
      );
    }
    if (row.type !== "product" && row.type !== "reform") {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: type이 "product" 또는 "reform"이 아닙니다.`
      );
    }
    return {
      order_id: row.order_id,
      id: row.id,
      type: row.type,
      product: (row.product ?? null) as OrderItemRowDTO["product"],
      selectedOption: (row.selectedOption ?? null) as OrderItemRowDTO["selectedOption"],
      quantity: row.quantity,
      reformData: (row.reformData ?? null) as OrderItemRowDTO["reformData"],
      appliedCoupon: (row.appliedCoupon ?? null) as OrderItemRowDTO["appliedCoupon"],
      created_at: row.created_at,
    };
  });
};

export const parseOrderDetailRow = (data: unknown): OrderDetailRowDTO => {
  if (!isRecord(data)) {
    throw new Error("주문 상세 응답이 올바르지 않습니다: 객체가 아닙니다.");
  }
  if (
    typeof data.id !== "string" ||
    typeof data.orderNumber !== "string" ||
    typeof data.date !== "string" ||
    typeof data.status !== "string" ||
    typeof data.totalPrice !== "number" ||
    typeof data.created_at !== "string"
  ) {
    throw new Error(
      "주문 상세 응답이 올바르지 않습니다: 필수 필드(id, orderNumber, date, status, totalPrice, created_at) 누락."
    );
  }
  if (!isOrderStatus(data.status)) {
    throw new Error(
      `주문 상세 응답이 올바르지 않습니다: status 값(${data.status})이 허용된 상태가 아닙니다.`
    );
  }
  const str = (v: unknown): string | null =>
    typeof v === "string" ? v : null;
  return {
    id: data.id,
    orderNumber: data.orderNumber,
    date: data.date,
    status: data.status,
    totalPrice: data.totalPrice,
    courierCompany: str(data.courierCompany),
    trackingNumber: str(data.trackingNumber),
    shippedAt: str(data.shippedAt),
    created_at: data.created_at,
    recipientName: str(data.recipientName),
    recipientPhone: str(data.recipientPhone),
    shippingAddress: str(data.shippingAddress),
    shippingAddressDetail: str(data.shippingAddressDetail),
    shippingPostalCode: str(data.shippingPostalCode),
    deliveryMemo: str(data.deliveryMemo),
    deliveryRequest: str(data.deliveryRequest),
  };
};

// ── row → DTO 변환 ──────────────────────────────────

export const fromOrderItemRowDTO = (item: OrderItemRowDTO): OrderItemDTO =>
  normalizeItemRow(item);
