import type { AppliedCouponDTO } from "./coupon";
import type { ProductDTO, ProductOptionDTO } from "./product";
import type { TieItemDTO } from "./reform";

export type OrderStatusDTO = "진행중" | "완료" | "배송중" | "대기중" | "취소";

export interface ProductOrderItemDTO {
  id: string;
  type: "product";
  product: ProductDTO;
  selectedOption?: ProductOptionDTO;
  quantity: number;
  appliedCoupon?: AppliedCouponDTO;
}

export interface ReformOrderItemDTO {
  id: string;
  type: "reform";
  quantity: number;
  reformData: {
    tie: TieItemDTO;
    cost: number;
  };
  appliedCoupon?: AppliedCouponDTO;
}

export type OrderItemDTO = ProductOrderItemDTO | ReformOrderItemDTO;

export interface OrderViewDTO {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatusDTO;
  items: OrderItemDTO[];
  totalPrice: number;
}

export interface OrderListRowDTO {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatusDTO;
  totalPrice: number;
  created_at: string;
}

/** order_detail_view row (customer order detail with shipping + tracking) */
export interface OrderDetailRowDTO {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatusDTO;
  totalPrice: number;
  courierCompany: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  created_at: string;
  recipientName: string | null;
  recipientPhone: string | null;
  shippingAddress: string | null;
  shippingAddressDetail: string | null;
  shippingPostalCode: string | null;
  deliveryMemo: string | null;
  deliveryRequest: string | null;
}

export interface OrderItemRowDTO {
  order_id: string;
  id: string;
  type: "product" | "reform";
  product: ProductDTO | null;
  selectedOption: ProductOptionDTO | null;
  quantity: number;
  reformData: {
    tie: TieItemDTO;
    cost: number;
  } | null;
  appliedCoupon: AppliedCouponDTO | null;
  created_at: string;
}
