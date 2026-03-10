import type { CreateOrderRequest } from "@/features/order/types/view/order-input";
import type { CreateOrderInputDTO } from "@yeongseon/shared/types/dto/order-input";
import type {
  OrderItemRowDTO,
  OrderItemDTO,
  OrderViewDTO,
  OrderListRowDTO,
  OrderDetailRowDTO,
  OrderStatusDTO,
  CustomOrderDataDTO,
} from "@yeongseon/shared/types/dto/order-view";
import type { CreateOrderResultDTO } from "@yeongseon/shared/types/dto/order-output";
import type { Order } from "@yeongseon/shared/types/view/order";
import {
  normalizeItemRow,
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
} from "@/lib/domain-type-guards";
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
          measurementType: tie.measurementType,
          tieLength: tie.tieLength,
          wearerHeight: tie.wearerHeight,
          notes: tie.notes,
          checked: tie.checked,
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
          deliveredAt: detail.deliveredAt ?? null,
        }
      : null,
  confirmedAt: detail.confirmedAt ?? null,
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
  if (!isProductCategory(v.category)) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: category 값(${v.category})이 허용된 값이 아닙니다.`
    );
  }
  if (!isProductColor(v.color)) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: color 값(${v.color})이 허용된 값이 아닙니다.`
    );
  }
  if (!isProductPattern(v.pattern)) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: pattern 값(${v.pattern})이 허용된 값이 아닙니다.`
    );
  }
  if (!isProductMaterial(v.material)) {
    throw new Error(
      `주문 상품 행(${idx})의 product가 올바르지 않습니다: material 값(${v.material})이 허용된 값이 아닙니다.`
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
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 reformData가 올바르지 않습니다: 객체가 아닙니다.`
    );
  }
  if (typeof v.cost !== "number") {
    throw new Error(
      `주문 상품 행(${idx})의 parseReformDataField: cost 필드가 없거나 숫자가 아닙니다.`
    );
  }
  const cost = v.cost;
  if (!isRecord(v.tie)) {
    throw new Error(
      `주문 상품 행(${idx})의 parseReformDataField: tie 필드가 없거나 객체가 아닙니다.`
    );
  }
  const tieRaw = v.tie;
  if (typeof tieRaw.id !== "string") {
    throw new Error(
      `주문 상품 행(${idx})의 parseReformDataField: tie.id 필드가 없거나 string이 아닙니다.`
    );
  }
  const measurementType =
    typeof tieRaw.measurementType === "string" && isTieMeasurementType(tieRaw.measurementType)
      ? tieRaw.measurementType
      : undefined;
  return {
    cost,
    tie: {
      id: tieRaw.id,
      image: typeof tieRaw.image === "string" ? tieRaw.image : undefined,
      measurementType,
      tieLength: typeof tieRaw.tieLength === "number" ? tieRaw.tieLength : undefined,
      wearerHeight: typeof tieRaw.wearerHeight === "number" ? tieRaw.wearerHeight : undefined,
      notes: typeof tieRaw.notes === "string" ? tieRaw.notes : undefined,
    },
  };
};

const parseCustomDataField = (
  v: unknown,
  idx: number
): CustomOrderDataDTO | null => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `주문 상품 행(${idx})의 reformData(custom)가 올바르지 않습니다: 객체가 아닙니다.`
    );
  }
  const rawOptions = v.options;
  const rawPricing = v.pricing;

  if (!isRecord(rawOptions) || !isRecord(rawPricing)) {
    return null;
  }

  if (
    typeof rawPricing.sewing_cost !== "number" ||
    typeof rawPricing.fabric_cost !== "number" ||
    typeof rawPricing.total_cost !== "number"
  ) {
    return null;
  }

  const refImages = Array.isArray(v.reference_images)
    ? (v.reference_images as unknown[])
        .filter(
          (item): item is { url: string; file_id: string | null } =>
            item !== null &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            typeof (item as Record<string, unknown>).url === "string"
        )
        .map((item) => item.url)
    : [];
  return {
    options: {
      tieType: typeof rawOptions.tie_type === "string" ? rawOptions.tie_type : null,
      interlining: typeof rawOptions.interlining === "string" ? rawOptions.interlining : null,
      designType: typeof rawOptions.design_type === "string" ? rawOptions.design_type : null,
      fabricType: typeof rawOptions.fabric_type === "string" ? rawOptions.fabric_type : null,
      fabricProvided: rawOptions.fabric_provided === true,
      triangleStitch: rawOptions.triangle_stitch === true,
      sideStitch: rawOptions.side_stitch === true,
      barTack: rawOptions.bar_tack === true,
      dimple: rawOptions.dimple === true,
      spoderato: rawOptions.spoderato === true,
      fold7: rawOptions.fold7 === true,
      brandLabel: rawOptions.brand_label === true,
      careLabel: rawOptions.care_label === true,
    },
    pricing: {
      sewingCost: rawPricing.sewing_cost,
      fabricCost: rawPricing.fabric_cost,
      totalCost: rawPricing.total_cost,
    },
    sample: v.sample === true,
    referenceImageUrls: refImages,
    additionalNotes: typeof v.additional_notes === "string" ? v.additional_notes : null,
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
  if (!isUserCouponStatus(v.status)) {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon이 올바르지 않습니다: status 값(${v.status})이 허용된 상태가 아닙니다.`
    );
  }
  if (!isDiscountType(v.coupon.discountType)) {
    throw new Error(
      `주문 상품 행(${idx})의 appliedCoupon.coupon이 올바르지 않습니다: discountType 값(${v.coupon.discountType})이 허용된 값이 아닙니다.`
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

const ORDER_STATUSES: ReadonlySet<string> = new Set([
  "진행중", "완료", "배송중", "배송완료", "대기중", "결제중", "취소",
  "접수", "제작중", "제작완료", "수선중", "수선완료",
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
    typeof data.payment_group_id !== "string" ||
    typeof data.total_amount !== "number" ||
    !Array.isArray(data.orders)
  ) {
    throw new Error(
      "주문 생성 응답이 올바르지 않습니다: payment_group_id, total_amount, orders 누락."
    );
  }
  const parseOrderItem = (
    item: unknown,
    index: number
  ): CreateOrderResultDTO["orders"][number] => {
    if (!isRecord(item)) {
      throw new Error(
        `주문 생성 응답의 orders[${index}]가 올바르지 않습니다: 객체가 아닙니다.`
      );
    }
    if (typeof item.order_id !== "string") {
      throw new Error(
        `주문 생성 응답의 orders[${index}].order_id가 올바르지 않습니다: string이 아닙니다.`
      );
    }
    if (typeof item.order_number !== "string") {
      throw new Error(
        `주문 생성 응답의 orders[${index}].order_number가 올바르지 않습니다: string이 아닙니다.`
      );
    }
    if (typeof item.order_type !== "string") {
      throw new Error(
        `주문 생성 응답의 orders[${index}].order_type이 올바르지 않습니다: string이 아닙니다.`
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
    if (row.type !== "product" && row.type !== "reform" && row.type !== "custom") {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: type이 "product", "reform", "custom" 중 하나가 아닙니다.`
      );
    }
    const product = parseProductField(row.product, i);
    const reformData = row.type === "reform" ? parseReformDataField(row.reformData, i) : null;
    const customData = row.type === "custom" ? parseCustomDataField(row.reformData, i) : null;
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
    if (row.type === "custom" && customData == null) {
      throw new Error(
        `주문 상품 행(${i})이 올바르지 않습니다: type이 "custom"인 경우 reformData(custom) 필드가 필요합니다.`
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
      customData,
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
    deliveredAt: str(data.deliveredAt),
    confirmedAt: str(data.confirmedAt),
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

export const parseConfirmPurchaseResponse = (
  data: unknown
): { pointsEarned: number } => {
  if (data == null || !isRecord(data)) {
    throw new Error("구매확정 응답이 올바르지 않습니다: 객체가 아닙니다.");
  }
  if (typeof data.points_earned !== "number") {
    throw new Error("구매확정 응답이 올바르지 않습니다: points_earned 누락.");
  }
  return { pointsEarned: data.points_earned };
};
