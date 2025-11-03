export interface OrderItem {
  id: string;
  date: string;
  status: "진행중" | "완료" | "배송중" | "대기중";
  type: "custom-order" | "reform";
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
  orderNumber: string;
  image?: string; // 대표 이미지
}
