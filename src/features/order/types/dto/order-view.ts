import type { AppliedCouponDTO } from "./coupon";
import type { ProductDTO, ProductOptionDTO } from "@/features/shop/types/dto/product";
import type { TieItemDTO } from "@/features/reform/types/dto/reform";

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
