import type { OrderItemRecord } from "../types/order-record";
import type { Product } from "@/features/shop/types/product";
import type { AppliedCoupon } from "../types/coupon";
import type { TieItem } from "@/features/reform/types/reform";
import type {
  OrderItem,
  ProductOrderItem,
  ReformOrderItem,
} from "../types/order-item";
import type { CartItem } from "@/features/cart/types/cart";

/**
 * 주문 생성 요청 데이터
 */
export interface CreateOrderRequest {
  items: CartItem[];
  shippingAddressId: string;
  totals: {
    originalPrice: number;
    totalDiscount: number;
    totalPrice: number;
  };
}

/**
 * 주문 생성 응답 데이터
 */
export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
}

/**
 * OrderItem을 OrderItemRecord로 변환
 */
export function mapOrderItemToRecord(
  item: OrderItem,
  orderId: string,
  unitPrice: number,
  discountAmount: number
): Omit<OrderItemRecord, "id" | "created_at"> {
  if (item.type === "product") {
    return {
      order_id: orderId,
      item_id: item.id,
      item_type: "product",
      product_id: item.product.id,
      selected_option_id: item.selectedOption?.id || null,
      reform_data: null,
      quantity: item.quantity,
      unit_price: unitPrice,
      discount_amount: discountAmount,
      applied_user_coupon_id: item.appliedCoupon?.id || null,
    };
  } else {
    // reform 타입
    return {
      order_id: orderId,
      item_id: item.id,
      item_type: "reform",
      product_id: null,
      selected_option_id: null,
      reform_data: {
        tie: {
          id: item.reformData.tie.id,
          image: item.reformData.tie.image
            ? typeof item.reformData.tie.image === "string"
              ? item.reformData.tie.image
              : undefined
            : undefined,
          measurementType: item.reformData.tie.measurementType,
          tieLength: item.reformData.tie.tieLength,
          wearerHeight: item.reformData.tie.wearerHeight,
          notes: item.reformData.tie.notes,
          checked: item.reformData.tie.checked,
        },
        cost: item.reformData.cost,
      },
      quantity: item.quantity,
      unit_price: unitPrice,
      discount_amount: discountAmount,
      applied_user_coupon_id: item.appliedCoupon?.id || null,
    };
  }
}

/**
 * OrderItemRecord를 OrderItem으로 변환
 */
export function mapRecordToOrderItem(
  record: OrderItemRecord,
  productsById: Map<number, Product>,
  couponsById?: Map<string, AppliedCoupon>
): OrderItem {
  if (record.item_type === "product") {
    if (!record.product_id) {
      throw new Error("Product ID is required for product order items");
    }

    const product = productsById.get(record.product_id);
    if (!product) {
      throw new Error(`Product not found: ${record.product_id}`);
    }

    const selectedOption = record.selected_option_id
      ? product.options?.find((opt) => opt.id === record.selected_option_id)
      : undefined;

    const appliedCoupon: AppliedCoupon | undefined =
      record.applied_user_coupon_id
        ? couponsById?.get(record.applied_user_coupon_id)
        : undefined;

    const orderItem: ProductOrderItem = {
      id: record.item_id,
      type: "product",
      product,
      selectedOption,
      quantity: record.quantity,
      appliedCoupon,
    };

    return orderItem;
  } else {
    // reform 타입
    if (!record.reform_data) {
      throw new Error("Reform data is required for reform order items");
    }

    const appliedCoupon: AppliedCoupon | undefined =
      record.applied_user_coupon_id
        ? couponsById?.get(record.applied_user_coupon_id)
        : undefined;

    const tie: TieItem = {
      id: record.reform_data.tie.id,
      image: record.reform_data.tie.image,
      measurementType: record.reform_data.tie.measurementType,
      tieLength: record.reform_data.tie.tieLength,
      wearerHeight: record.reform_data.tie.wearerHeight,
      notes: record.reform_data.tie.notes,
      checked: record.reform_data.tie.checked,
    };

    const orderItem: ReformOrderItem = {
      id: record.item_id,
      type: "reform",
      quantity: record.quantity,
      reformData: {
        tie,
        cost: record.reform_data.cost,
      },
      appliedCoupon,
    };

    return orderItem;
  }
}
