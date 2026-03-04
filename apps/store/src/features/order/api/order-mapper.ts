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
import type { UserCouponStatusDTO } from "@yeongseon/shared/types/dto/coupon";
import type {
  ProductCategoryDTO,
  ProductColorDTO,
  ProductMaterialDTO,
  ProductPatternDTO,
} from "@yeongseon/shared/types/dto/product";
import type { Order } from "@yeongseon/shared/types/view/order";
import {
  normalizeItemRow,
  toOrderItemView,
} from "@yeongseon/shared/mappers/shared-mapper";
import { isRecord } from "@/lib/type-guard";

export const toOrderItemInputDTO = (
  item: CreateOrderRequest["items"][number]
): CreateOrderInputDTO["items"][number] => {
  const baseRecord = {
    item_id: item.id,
    quantity: item.quantity,
    applied_user_coupon_id: item.appliedCoupon?.id ?? null,
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

// JSONB 중첩 필드 검증 헬퍼
const parseProductField = (
  v: unknown,
  idx: number
): OrderItemRowDTO["product"] => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: 객체가 아닙니다.`
    );
  }
  if (
    typeof v.id !== "number" ||
    typeof v.code !== "string" ||
    typeof v.name !== "string" ||
    typeof v.price !== "number" ||
    typeof v.image !== "string" ||
    typeof v.category !== "string" ||
    typeof v.color !== "string" ||
    typeof v.pattern !== "string" ||
    typeof v.material !== "string" ||
    typeof v.likes !== "number" ||
    typeof v.info !== "string"
  ) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: 필수 필드(id, code, name, price, image, category, color, pattern, material, likes, info) 누락.`
    );
  }
  return {
    id: v.id,
    code: v.code,
    name: v.name,
    price: v.price,
    image: v.image,
    category: v.category as ProductCategoryDTO,
    color: v.color as ProductColorDTO,
    pattern: v.pattern as ProductPatternDTO,
    material: v.material as ProductMaterialDTO,
    likes: v.likes,
    info: v.info,
  };
};

const parseSelectedOptionField = (
  v: unknown,
  idx: number
): OrderItemRowDTO["selectedOption"] => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 selectedOption이 올바르지 않습니다: 객체가 아닙니다.`
    );
  }
  if (
    typeof v.id !== "string" ||
    typeof v.name !== "string" ||
    typeof v.additionalPrice !== "number"
  ) {
    throw new Error(
      `주문 상품 행(${idx})의 selectedOption이 올바르지 않습니다: 필수 필드(id, name, additionalPrice) 누락.`
    );
  }
  return {
    id: v.id,
    name: v.name,
    additionalPrice: v.additionalPrice,
  };
};

const parseReformDataField = (
  v: unknown,
  idx: number
): OrderItemRowDTO["reformData"] => {
  if (v == null) return null;
  if (!isRecord(v) || typeof v.cost !== "number") {
    throw new Error(
      `주문 상품 행(${idx})의 reformData가 올바르지 않습니다: cost 필드 누락.`
    );
  }
  if (!isRecord(v.tie) || typeof v.tie.id !== "string") {
    throw new Error(
      `주문 상품 행(${idx})의 reformData.tie가 올바르지 않습니다: id 필드 누락.`
    );
  }
  return {
    cost: v.cost,
    tie: { id: v.tie.id },
  };
};

const parseAppliedCouponField = (
  v: unknown,
  idx: number
): OrderItemRowDTO["appliedCoupon"] => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon이 올바르지 않습니다: 객체가 아닙니다.`
    );
  }
  if (
    typeof v.id !== "string" ||
    typeof v.userId !== "string" ||
    typeof v.couponId !== "string" ||
    typeof v.status !== "string" ||
    typeof v.issuedAt !== "string"
  ) {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon이 올바르지 않습니다: 필수 필드(id, userId, couponId, status, issuedAt) 누락.`
    );
  }
  if (!isRecord(v.coupon) || typeof v.coupon.id !== "string" || typeof v.coupon.name !== "string") {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon.coupon이 올바르지 않습니다: 필수 필드(id, name) 누락.`
    );
  }
  if (
    typeof v.coupon.discountType !== "string" ||
    typeof v.coupon.discountValue !== "number" ||
    typeof v.coupon.expiryDate !== "string"
  ) {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon.coupon이 올바르지 않습니다: 필수 필드(discountType, discountValue, expiryDate) 누락.`
    );
  }
  return {
    id: v.id,
    userId: v.userId,
    couponId: v.couponId,
    status: v.status as UserCouponStatusDTO,
    issuedAt: v.issuedAt,
    coupon: {
      id: v.coupon.id,
      name: v.coupon.name,
      discountType: v.coupon.discountType as "percentage" | "fixed",
      discountValue: v.coupon.discountValue,
      expiryDate: v.coupon.expiryDate,
    },
  };
};

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
    const product = parseProductField(row.product, i);
    const reformData = parseReformDataField(row.reformData, i);
    if (row.type === "product" && product == null) {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: type이 "product"인 경우 product 필드가 필요합니다.`
      );
    }
    if (row.type === "reform" && reformData == null) {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: type이 "reform"인 경우 reformData 필드가 필요합니다.`
      );
    }
    return {
      order_id: row.order_id,
      id: row.id,
      type: row.type,
      product,
      selectedOption: parseSelectedOptionField(row.selectedOption, i),
      quantity: row.quantity,
      reformData,
      appliedCoupon: parseAppliedCouponField(row.appliedCoupon, i),
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
