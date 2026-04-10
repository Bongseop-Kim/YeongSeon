import type { CreateOrderRequest } from "@/entities/order/model/view/order-input";
import type { CreateOrderInputDTO } from "@yeongseon/shared/types/dto/order-input";
import type {
  OrderItemRowDTO,
  OrderItemDTO,
  OrderViewDTO,
  OrderListRowDTO,
  OrderDetailRowDTO,
  OrderStatusDTO,
  CustomOrderDataDTO,
  SampleOrderDataDTO,
} from "@yeongseon/shared/types/dto/order-view";
import type { CustomerAction } from "@yeongseon/shared";
import type { CreateOrderResultDTO } from "@yeongseon/shared/types/dto/order-output";
import type { Order } from "@yeongseon/shared/types/view/order";
import {
  normalizeItemRow,
  parseCustomOrderData,
  parseSampleOrderData,
  toOrderItemView,
} from "@yeongseon/shared/mappers/shared-mapper";
import {
  isDiscountType,
  isProductCategory,
  isProductColor,
  isProductMaterial,
  isProductPattern,
  isTieMeasurementType,
  isUserCouponStatus,
} from "@/shared/lib/domain-type-guards";
import { isRecord } from "@/shared/lib/type-guard";

export const toOrderItemInputDTO = (
  item: CreateOrderRequest["items"][number],
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
    reform_data: (() => {
      if (!item.reformData?.tie) return null;
      const { tie } = item.reformData;
      if (typeof tie.id !== "string") {
        return null;
      }
      return {
        tie: {
          id: tie.id,
          image: typeof tie.image === "string" ? tie.image : undefined,
          fileId: tie.fileId,
          measurementType: tie.measurementType,
          tieLength: tie.tieLength,
          wearerHeight: tie.wearerHeight,
          notes: tie.notes,
          checked: tie.checked,
          dimple: tie.dimple,
          hasLengthReform: tie.hasLengthReform,
          hasWidthReform: tie.hasWidthReform,
          targetWidth: tie.targetWidth,
        },
        cost: item.reformData.cost,
      };
    })(),
  };
};

export const toOrderView = (order: OrderViewDTO): Order => ({
  ...order,
  items: order.items.map(toOrderItemView),
  shippingInfo: null,
  trackingInfo: null,
  confirmedAt: null,
  customerActions: order.customerActions,
});

export const toOrderViewFromDetail = (
  detail: OrderDetailRowDTO,
  items: OrderItemDTO[],
): Order => {
  const hasCustomerTracking =
    detail.courierCompany !== null || detail.trackingNumber !== null;
  const hasCompanyTracking =
    detail.companyCourierCompany !== null ||
    detail.companyTrackingNumber !== null;

  return {
    id: detail.id,
    orderNumber: detail.orderNumber,
    date: detail.date,
    status: detail.status,
    orderType: detail.orderType,
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
      hasCustomerTracking || hasCompanyTracking
        ? {
            courierCompany: detail.courierCompany ?? null,
            trackingNumber: detail.trackingNumber ?? null,
            shippedAt: detail.shippedAt ?? null,
            deliveredAt: detail.deliveredAt ?? null,
            companyCourierCompany: detail.companyCourierCompany ?? null,
            companyTrackingNumber: detail.companyTrackingNumber ?? null,
            companyShippedAt: detail.companyShippedAt ?? null,
          }
        : null,
    confirmedAt: detail.confirmedAt ?? null,
    customerActions: detail.customerActions,
  };
};

// ── parse helpers (런타임 검증) ──────────────────────

// JSONB 중첩 필드 검증 헬퍼
const parseProductField = (
  v: unknown,
  idx: number,
): OrderItemRowDTO["product"] => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: 객체가 아닙니다.`,
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
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: 필수 필드(id, code, name, price, image, category, color, pattern, material, likes, info) 누락.`,
    );
  }
  if (!isProductCategory(v.category)) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: category 값(${v.category})이 허용된 값이 아닙니다.`,
    );
  }
  if (!isProductColor(v.color)) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: color 값(${v.color})이 허용된 값이 아닙니다.`,
    );
  }
  if (!isProductPattern(v.pattern)) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: pattern 값(${v.pattern})이 허용된 값이 아닙니다.`,
    );
  }
  if (!isProductMaterial(v.material)) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: material 값(${v.material})이 허용된 값이 아닙니다.`,
    );
  }
  return {
    id: v.id,
    code: v.code,
    name: v.name,
    price: v.price,
    image: v.image,
    category: v.category,
    color: v.color,
    pattern: v.pattern,
    material: v.material,
    likes: v.likes,
    info: v.info,
  };
};

const parseSelectedOptionField = (
  v: unknown,
  idx: number,
): OrderItemRowDTO["selectedOption"] => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 selectedOption이 올바르지 않습니다: 객체가 아닙니다.`,
    );
  }
  if (
    typeof v.id !== "string" ||
    typeof v.name !== "string" ||
    typeof v.additionalPrice !== "number"
  ) {
    throw new Error(
      `주문 상품 행(${idx})의 selectedOption이 올바르지 않습니다: 필수 필드(id, name, additionalPrice) 누락.`,
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
  idx: number,
): OrderItemRowDTO["reformData"] => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 reformData가 올바르지 않습니다: 객체가 아닙니다.`,
    );
  }
  if (typeof v.cost !== "number") {
    throw new Error(
      `주문 상품 행(${idx})의 parseReformDataField: cost 필드가 없거나 숫자가 아닙니다.`,
    );
  }
  const cost = v.cost;
  if (!isRecord(v.tie)) {
    throw new Error(
      `주문 상품 행(${idx})의 parseReformDataField: tie 필드가 없거나 객체가 아닙니다.`,
    );
  }
  const tieRaw = v.tie;
  if (typeof tieRaw.id !== "string") {
    throw new Error(
      `주문 상품 행(${idx})의 parseReformDataField: tie.id 필드가 없거나 string이 아닙니다.`,
    );
  }
  const measurementType =
    typeof tieRaw.measurementType === "string" &&
    isTieMeasurementType(tieRaw.measurementType)
      ? tieRaw.measurementType
      : undefined;
  return {
    cost,
    tie: {
      id: tieRaw.id,
      image: typeof tieRaw.image === "string" ? tieRaw.image : undefined,
      fileId: typeof tieRaw.fileId === "string" ? tieRaw.fileId : undefined,
      measurementType,
      tieLength:
        typeof tieRaw.tieLength === "number" ? tieRaw.tieLength : undefined,
      wearerHeight:
        typeof tieRaw.wearerHeight === "number"
          ? tieRaw.wearerHeight
          : undefined,
      notes: typeof tieRaw.notes === "string" ? tieRaw.notes : undefined,
      dimple: typeof tieRaw.dimple === "boolean" ? tieRaw.dimple : undefined,
      hasLengthReform:
        typeof tieRaw.hasLengthReform === "boolean"
          ? tieRaw.hasLengthReform
          : undefined,
      hasWidthReform:
        typeof tieRaw.hasWidthReform === "boolean"
          ? tieRaw.hasWidthReform
          : undefined,
      targetWidth:
        typeof tieRaw.targetWidth === "number" ? tieRaw.targetWidth : undefined,
    },
  };
};

const parseCustomDataField = (
  v: unknown,
  idx: number,
): CustomOrderDataDTO | null => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 reformData(custom)가 올바르지 않습니다: 객체가 아닙니다.`,
    );
  }
  try {
    return parseCustomOrderData(v);
  } catch (err) {
    throw new Error(
      `주문 상품 행(${idx}) parseCustomOrderData 실패: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

const parseSampleDataField = (
  v: unknown,
  idx: number,
): SampleOrderDataDTO | null => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 sampleData가 올바르지 않습니다: 객체가 아닙니다.`,
    );
  }
  try {
    return parseSampleOrderData(v);
  } catch (err) {
    throw new Error(
      `주문 상품 행(${idx}) parseSampleOrderData 실패: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

const parseAppliedCouponField = (
  v: unknown,
  idx: number,
): OrderItemRowDTO["appliedCoupon"] => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon이 올바르지 않습니다: 객체가 아닙니다.`,
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
      `주문 상품 행(${idx})의 appliedCoupon이 올바르지 않습니다: 필수 필드(id, userId, couponId, status, issuedAt) 누락.`,
    );
  }
  if (
    !isRecord(v.coupon) ||
    typeof v.coupon.id !== "string" ||
    typeof v.coupon.name !== "string"
  ) {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon.coupon이 올바르지 않습니다: 필수 필드(id, name) 누락.`,
    );
  }
  if (
    typeof v.coupon.discountType !== "string" ||
    typeof v.coupon.discountValue !== "number" ||
    typeof v.coupon.expiryDate !== "string"
  ) {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon.coupon이 올바르지 않습니다: 필수 필드(discountType, discountValue, expiryDate) 누락.`,
    );
  }
  if (!isUserCouponStatus(v.status)) {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon이 올바르지 않습니다: status 값(${v.status})이 허용된 상태가 아닙니다.`,
    );
  }
  if (!isDiscountType(v.coupon.discountType)) {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon.coupon이 올바르지 않습니다: discountType 값(${v.coupon.discountType})이 허용된 값이 아닙니다.`,
    );
  }
  return {
    id: v.id,
    userId: v.userId,
    couponId: v.couponId,
    status: v.status,
    issuedAt: v.issuedAt,
    expiresAt: typeof v.expiresAt === "string" ? v.expiresAt : null,
    usedAt: typeof v.usedAt === "string" ? v.usedAt : null,
    coupon: {
      id: v.coupon.id,
      name: v.coupon.name,
      discountType: v.coupon.discountType,
      discountValue: v.coupon.discountValue,
      expiryDate: v.coupon.expiryDate,
    },
  };
};

const CUSTOMER_ACTIONS_ARRAY = [
  "claim_cancel",
  "claim_return",
  "claim_exchange",
  "confirm_purchase",
] as const satisfies readonly CustomerAction[];
const CUSTOMER_ACTIONS: ReadonlySet<string> = new Set(CUSTOMER_ACTIONS_ARRAY);
const isCustomerAction = (v: string): v is CustomerAction =>
  CUSTOMER_ACTIONS.has(v);

const parseCustomerActions = (v: unknown): CustomerAction[] => {
  if (!Array.isArray(v)) return [];
  return v
    .filter((a): a is string => typeof a === "string")
    .filter(isCustomerAction);
};

const ORDER_STATUSES: ReadonlySet<string> = new Set([
  "진행중",
  "완료",
  "배송중",
  "배송완료",
  "대기중",
  "결제중",
  "취소",
  "실패",
  "접수",
  "제작중",
  "제작완료",
  "수선중",
  "수선완료",
  "발송대기",
  "발송중",
]);
const isOrderStatus = (v: string): v is OrderStatusDTO => ORDER_STATUSES.has(v);

const ORDER_TYPES: ReadonlySet<string> = new Set([
  "sale",
  "custom",
  "repair",
  "token",
  "sample",
]);
const isOrderType = (v: string): v is OrderListRowDTO["orderType"] =>
  ORDER_TYPES.has(v);

export const parseCreateOrderResult = (data: unknown): CreateOrderResultDTO => {
  if (!isRecord(data)) {
    throw new Error("주문 생성 응답이 올바르지 않습니다: 객체가 아닙니다.");
  }
  if (
    typeof data.payment_group_id !== "string" ||
    typeof data.total_amount !== "number" ||
    !Array.isArray(data.orders)
  ) {
    throw new Error(
      "주문 생성 응답이 올바르지 않습니다: payment_group_id, total_amount, orders 누락.",
    );
  }
  const parseOrderItem = (
    item: unknown,
    index: number,
  ): CreateOrderResultDTO["orders"][number] => {
    if (!isRecord(item)) {
      throw new Error(
        `주문 생성 응답의 orders[${index}]가 올바르지 않습니다: 객체가 아닙니다.`,
      );
    }
    if (typeof item.order_id !== "string") {
      throw new Error(
        `주문 생성 응답의 orders[${index}].order_id가 올바르지 않습니다: string이 아닙니다.`,
      );
    }
    if (typeof item.order_number !== "string") {
      throw new Error(
        `주문 생성 응답의 orders[${index}].order_number가 올바르지 않습니다: string이 아닙니다.`,
      );
    }
    if (typeof item.order_type !== "string") {
      throw new Error(
        `주문 생성 응답의 orders[${index}].order_type이 올바르지 않습니다: string이 아닙니다.`,
      );
    }
    return {
      order_id: item.order_id,
      order_number: item.order_number,
      order_type: item.order_type,
    };
  };
  return {
    payment_group_id: data.payment_group_id,
    total_amount: data.total_amount,
    orders: data.orders.map((item, index) => parseOrderItem(item, index)),
  };
};

export const parseOrderListRows = (data: unknown): OrderListRowDTO[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error("주문 목록 응답이 올바르지 않습니다: 배열이 아닙니다.");
  }
  return data.map((row: unknown, i: number): OrderListRowDTO => {
    if (!isRecord(row)) {
      throw new Error(
        `주문 목록 행(${i})이 올바르지 않습니다: 객체가 아닙니다.`,
      );
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
        `주문 목록 행(${i})이 올바르지 않습니다: 필수 필드(id, orderNumber, date, status, totalPrice, created_at) 누락.`,
      );
    }
    if (!isOrderStatus(row.status)) {
      throw new Error(
        `주문 목록 행(${i})이 올바르지 않습니다: status 값(${row.status})이 허용된 상태가 아닙니다.`,
      );
    }
    if (typeof row.orderType !== "string" || !isOrderType(row.orderType)) {
      throw new Error(
        `주문 목록 행(${i})이 올바르지 않습니다: orderType 값(${row.orderType})이 허용된 유형이 아닙니다.`,
      );
    }
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      date: row.date,
      status: row.status,
      totalPrice: row.totalPrice,
      orderType: row.orderType,
      created_at: row.created_at,
      customerActions: parseCustomerActions(row.customerActions),
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
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: 객체가 아닙니다.`,
      );
    }
    if (
      typeof row.id !== "string" ||
      typeof row.order_id !== "string" ||
      typeof row.quantity !== "number" ||
      typeof row.created_at !== "string"
    ) {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: 필수 필드(id, order_id, quantity, created_at) 누락.`,
      );
    }
    if (
      row.type !== "product" &&
      row.type !== "reform" &&
      row.type !== "custom" &&
      row.type !== "token" &&
      row.type !== "sample"
    ) {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: type이 "product", "reform", "custom", "token", "sample" 중 하나가 아닙니다.`,
      );
    }
    const product = parseProductField(row.product, i);
    const reformData =
      row.type === "reform" ? parseReformDataField(row.reformData, i) : null;
    const customData =
      row.type === "custom" ? parseCustomDataField(row.reformData, i) : null;
    const sampleData =
      row.type === "sample" ? parseSampleDataField(row.sampleData, i) : null;
    if (row.type === "product" && product == null) {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: type이 "product"인 경우 product 필드가 필요합니다.`,
      );
    }
    if (row.type === "reform" && reformData == null) {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: type이 "reform"인 경우 reformData 필드가 필요합니다.`,
      );
    }
    if (row.type === "custom" && customData == null) {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: type이 "custom"인 경우 reformData(custom) 필드가 필요합니다.`,
      );
    }
    if (row.type === "token") {
      return {
        order_id: row.order_id,
        id: row.id,
        type: "token",
        product: null,
        selectedOption: null,
        quantity: row.quantity,
        reformData: null,
        customData: null,
        sampleData: null,
        appliedCoupon: parseAppliedCouponField(row.appliedCoupon, i),
        created_at: row.created_at,
      };
    }
    return {
      order_id: row.order_id,
      id: row.id,
      type: row.type,
      product,
      selectedOption: parseSelectedOptionField(row.selectedOption, i),
      quantity: row.quantity,
      reformData,
      customData,
      sampleData,
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
      "주문 상세 응답이 올바르지 않습니다: 필수 필드(id, orderNumber, date, status, totalPrice, created_at) 누락.",
    );
  }
  if (!isOrderStatus(data.status)) {
    throw new Error(
      `주문 상세 응답이 올바르지 않습니다: status 값(${data.status})이 허용된 상태가 아닙니다.`,
    );
  }
  if (typeof data.orderType !== "string" || !isOrderType(data.orderType)) {
    throw new Error(
      `주문 상세 응답이 올바르지 않습니다: orderType 값(${data.orderType})이 허용된 유형이 아닙니다.`,
    );
  }
  const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
  return {
    id: data.id,
    orderNumber: data.orderNumber,
    date: data.date,
    status: data.status,
    totalPrice: data.totalPrice,
    orderType: data.orderType,
    courierCompany: str(data.courierCompany),
    trackingNumber: str(data.trackingNumber),
    shippedAt: str(data.shippedAt),
    deliveredAt: str(data.deliveredAt),
    companyCourierCompany: str(data.companyCourierCompany),
    companyTrackingNumber: str(data.companyTrackingNumber),
    companyShippedAt: str(data.companyShippedAt),
    confirmedAt: str(data.confirmedAt),
    created_at: data.created_at,
    recipientName: str(data.recipientName),
    recipientPhone: str(data.recipientPhone),
    shippingAddress: str(data.shippingAddress),
    shippingAddressDetail: str(data.shippingAddressDetail),
    shippingPostalCode: str(data.shippingPostalCode),
    deliveryMemo: str(data.deliveryMemo),
    deliveryRequest: str(data.deliveryRequest),
    customerActions: parseCustomerActions(data.customerActions),
  };
};

// ── row → DTO 변환 ──────────────────────────────────

export const fromOrderItemRowDTO = (item: OrderItemRowDTO): OrderItemDTO =>
  normalizeItemRow(item);
