import type { Product, ProductOption } from "./product";
import type { AppliedCoupon } from "./coupon";
import type { TieItem } from "./reform";

// 주문 상태
export type OrderStatus =
  | "진행중"
  | "완료"
  | "배송중"
  | "배송완료"
  | "대기중"
  | "결제중"
  | "취소"
  | "실패"
  | "접수"
  | "제작중"
  | "제작완료"
  | "수선중"
  | "수선완료"
  | "샘플원단제작중"
  | "샘플원단배송중"
  | "샘플봉제제작중"
  | "샘플넥타이배송중"
  | "샘플배송완료"
  | "샘플승인";

// 일반 상품 주문 아이템
export interface ProductOrderItem {
  id: string;
  type: "product";
  product: Product;
  selectedOption?: ProductOption;
  quantity: number;
  appliedCoupon?: AppliedCoupon;
}

// 수선 주문 아이템
export interface ReformOrderItem {
  id: string;
  type: "reform";
  quantity: number;
  reformData: {
    tie: TieItem;
    cost: number;
  };
  appliedCoupon?: AppliedCoupon;
}

// 주문 제작 아이템
export interface CustomOrderItem {
  id: string;
  type: "custom";
  quantity: number;
  customData: {
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
  };
  appliedCoupon?: AppliedCoupon;
}

// 토큰 구매 아이템
export interface TokenOrderItem {
  id: string;
  type: "token";
  quantity: number;
  appliedCoupon?: AppliedCoupon;
}

// 주문 아이템 (일반 상품, 수선, 주문 제작 또는 토큰 구매)
export type OrderItem =
  | ProductOrderItem
  | ReformOrderItem
  | CustomOrderItem
  | TokenOrderItem;

// 배송지 정보
export interface ShippingInfo {
  recipientName: string;
  recipientPhone: string;
  address: string;
  addressDetail: string | null;
  postalCode: string;
  deliveryMemo: string | null;
  deliveryRequest: string | null;
}

// 배송 추적 정보
export interface TrackingInfo {
  courierCompany: string;
  trackingNumber: string;
  shippedAt: string | null;
  deliveredAt: string | null;
}

// 주문 (한 주문에 여러 상품이 포함됨)
export interface Order {
  id: string;
  orderNumber: string; // 주문 번호
  date: string; // 주문 날짜
  status: OrderStatus;
  orderType: "sale" | "custom" | "repair" | "token";
  items: OrderItem[]; // 주문에 포함된 상품들
  totalPrice: number; // 총 주문 금액
  shippingInfo: ShippingInfo | null;
  trackingInfo: TrackingInfo | null;
  confirmedAt: string | null; // 구매확정 시점
}
