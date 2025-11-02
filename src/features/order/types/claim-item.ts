export interface ClaimItem {
  id: string;
  date: string;
  status: "접수" | "처리중" | "완료" | "거부";
  type: "cancel" | "return" | "exchange";
  orderId: string;
  orderNumber: string;
  reason: string;
  orderDetails: {
    // 맞춤 제작 주문
    fabricType?: "SILK" | "POLY";
    designType?: "PRINTING" | "YARN_DYED";
    tieType?: "MANUAL" | "AUTO";
    quantity?: number;
    // 수선 주문
    tieCount?: number;
    measurementType?: "length" | "height";
  };
  price: number;
  image?: string;
}
