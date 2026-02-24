import type {
  ClaimItemRowDTO,
  ClaimListRowDTO,
} from "@/features/order/types/dto/claim-view";
import type { CreateClaimInputDTO } from "@/features/order/types/dto/claim-input";
import type { OrderItemDTO } from "@/features/order/types/dto/order-view";
import type { ClaimItem } from "@/features/order/types/claim-item";
import type { CreateClaimRequest } from "@/features/order/types/view/claim-input";
import {
  toAppliedCouponView,
  toProductOptionView,
  toProductView,
  toTieItemView,
} from "@/features/shared/api/shared-mapper";

/**
 * claim_list_view의 item jsonb → 정규화된 OrderItemDTO
 * (fromOrderItemRowDTO와 동일 로직, order_id/created_at 없는 입력 대응)
 */
export const fromClaimItemRowDTO = (item: ClaimItemRowDTO): OrderItemDTO => {
  if (item.type === "product") {
    const product = item.product ?? {
      id: -1,
      code: "DELETED",
      name: "삭제된 상품",
      price: 0,
      image: "",
      deleted: true,
      category: "3fold" as const,
      color: "black" as const,
      pattern: "solid" as const,
      material: "silk" as const,
      likes: 0,
      info: "",
      options: [],
    };
    return {
      id: item.id,
      type: "product",
      product,
      selectedOption: item.selectedOption ?? undefined,
      quantity: item.quantity,
      appliedCoupon: item.appliedCoupon ?? undefined,
    };
  }

  if (!item.reformData) {
    throw new Error("주문 수선 데이터가 올바르지 않습니다.");
  }

  return {
    id: item.id,
    type: "reform",
    quantity: item.quantity,
    reformData: item.reformData,
    appliedCoupon: item.appliedCoupon ?? undefined,
  };
};

/**
 * OrderItemDTO → OrderItem (View)
 * order-mapper의 toOrderItem과 동일한 변환
 */
const toOrderItemView = (item: OrderItemDTO): ClaimItem["item"] => {
  if (item.type === "product") {
    if (!item.product) {
      throw new Error("Product data is required for product order items.");
    }
    return {
      ...item,
      product: toProductView(item.product),
      selectedOption: item.selectedOption
        ? toProductOptionView(item.selectedOption)
        : undefined,
      appliedCoupon: toAppliedCouponView(item.appliedCoupon),
    };
  }

  if (!item.reformData) {
    throw new Error("Reform data is required for reform order items.");
  }

  return {
    ...item,
    reformData: {
      ...item.reformData,
      tie: toTieItemView(item.reformData.tie),
    },
    appliedCoupon: toAppliedCouponView(item.appliedCoupon),
  };
};

/**
 * ClaimListRowDTO → ClaimItem (View)
 */
export const toClaimItemView = (row: ClaimListRowDTO): ClaimItem => {
  const itemDTO = fromClaimItemRowDTO(row.item);

  return {
    id: row.id,
    claimNumber: row.claimNumber,
    date: row.date,
    status: row.status,
    type: row.type,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    item: toOrderItemView(itemDTO),
    reason: row.reason,
  };
};

/**
 * CreateClaimRequest (View) → CreateClaimInputDTO (RPC params)
 */
export const toCreateClaimInputDTO = (
  request: CreateClaimRequest
): CreateClaimInputDTO => ({
  p_type: request.type,
  p_order_id: request.orderId,
  p_item_id: request.itemId,
  p_reason: request.reason,
  p_description: request.description ?? null,
  p_quantity: request.quantity ?? null,
});
