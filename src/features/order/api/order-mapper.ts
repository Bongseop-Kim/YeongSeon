import type { CreateOrderRequest } from "@/features/order/types/view/order-input";
import type { CreateOrderInputDTO } from "@/features/order/types/dto/order-input";
import type {
  AppliedCouponDTO,
  CouponDTO,
} from "@/features/order/types/dto/coupon";
import type {
  OrderItemDTO,
  OrderViewDTO,
  ProductOrderItemDTO,
  ReformOrderItemDTO,
} from "@/features/order/types/dto/order-view";
import type { Order } from "@/features/order/types/view/order";
import type {
  AppliedCoupon,
  Coupon,
} from "@/features/order/types/coupon";
import type { Product, ProductOption } from "@/features/shop/types/product";
import type { ProductDTO, ProductOptionDTO } from "@/features/shop/types/dto/product";
import type { TieItem } from "@/features/reform/types/reform";
import type { TieItemDTO } from "@/features/reform/types/dto/reform";
import { getOrderItemPricing } from "@/features/order/utils/calculated-order-totals";

export const toOrderItemInputDTO = (
  item: CreateOrderRequest["items"][number]
): CreateOrderInputDTO["p_order_items"][number] => {
  const { unitPrice, discount } = getOrderItemPricing(item);

  const baseRecord = {
    item_id: item.id,
    quantity: item.quantity,
    unit_price: unitPrice,
    discount_amount: discount,
    applied_user_coupon_id: item.appliedCoupon?.id || null,
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
    reform_data: {
      tie: {
        ...item.reformData.tie,
        image:
          typeof item.reformData.tie.image === "string"
            ? item.reformData.tie.image
            : undefined,
      },
      cost: item.reformData.cost,
    },
  };
};

const toProductOption = (option: ProductOptionDTO): ProductOption => ({
  ...option,
});

const toProduct = (product: ProductDTO): Product => ({
  ...product,
  options: product.options?.map(toProductOption),
});

const toCoupon = (coupon: CouponDTO): Coupon => ({
  ...coupon,
});

const toAppliedCoupon = (
  coupon?: AppliedCouponDTO
): AppliedCoupon | undefined =>
  coupon
    ? {
        ...coupon,
        coupon: toCoupon(coupon.coupon),
      }
    : undefined;

const toTieItem = (tie: TieItemDTO): TieItem => ({
  ...tie,
});

const toOrderItem = (item: OrderItemDTO): Order["items"][number] => {
  if (item.type === "product") {
    const productItem: ProductOrderItemDTO = item;
    return {
      ...productItem,
      product: toProduct(productItem.product),
      selectedOption: productItem.selectedOption
        ? toProductOption(productItem.selectedOption)
        : undefined,
      appliedCoupon: toAppliedCoupon(productItem.appliedCoupon),
    };
  }

  const reformItem: ReformOrderItemDTO = item;
  return {
    ...reformItem,
    reformData: {
      ...reformItem.reformData,
      tie: toTieItem(reformItem.reformData.tie),
    },
    appliedCoupon: toAppliedCoupon(reformItem.appliedCoupon),
  };
};

export const toOrderView = (order: OrderViewDTO): Order => ({
  ...order,
  items: order.items.map(toOrderItem),
});
