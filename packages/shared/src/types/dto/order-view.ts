import type { AppliedCouponDTO } from "./coupon";
import type { ProductDTO, ProductOptionDTO } from "./product";
import type { TieItemDTO } from "./reform";

export type OrderStatusDTO =
  | "진행중" | "완료" | "배송중" | "배송완료" | "대기중" | "결제중" | "취소"
  | "접수" | "제작중" | "제작완료"
  | "수선중" | "수선완료"
  | "샘플원단제작중" | "샘플원단배송중" | "샘플봉제제작중"
  | "샘플넥타이배송중" | "샘플배송완료" | "샘플승인";

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

export interface CustomOrderDataDTO {
  options: {
    tieType: string | null;
    interlining: string | null;
    designType: string | null;
    fabricType: string | null;
    fabricProvided: boolean;
    triangleStitch: boolean;
    sideStitch: boolean;
    barTack: boolean;
    dimple: boolean;
    spoderato: boolean;
    fold7: boolean;
    brandLabel: boolean;
    careLabel: boolean;
  };
  pricing: {
    sewingCost: number;
    fabricCost: number;
    sampleCost: number;
    totalCost: number;
  };
  sample: boolean;
  sampleType: string | null;
  referenceImageUrls: string[];
  additionalNotes: string | null;
}

export interface CustomOrderItemDTO {
  id: string;
  type: "custom";
  quantity: number;
  customData: CustomOrderDataDTO;
  appliedCoupon?: AppliedCouponDTO;
}

export interface TokenOrderItemDTO {
  id: string;
  type: "token";
  quantity: number;
  appliedCoupon?: AppliedCouponDTO;
}

export type OrderItemDTO =
  | ProductOrderItemDTO
  | ReformOrderItemDTO
  | CustomOrderItemDTO
  | TokenOrderItemDTO;

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
  deliveredAt: string | null;
  confirmedAt: string | null;
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
  type: "product" | "reform" | "custom" | "token";
  product: ProductDTO | null;
  selectedOption: ProductOptionDTO | null;
  quantity: number;
  reformData: {
    tie: TieItemDTO;
    cost: number;
  } | null;
  customData: CustomOrderDataDTO | null;
  appliedCoupon: AppliedCouponDTO | null;
  created_at: string;
}
