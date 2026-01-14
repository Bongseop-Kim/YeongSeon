/**
 * DB 레코드 타입
 */
export interface OrderRecord {
  id: string;
  user_id: string;
  order_number: string;
  shipping_address_id: string;
  total_price: number;
  original_price: number;
  total_discount: number;
  status: "대기중" | "진행중" | "배송중" | "완료" | "취소";
  created_at: string;
  updated_at: string;
}

export interface OrderItemRecord {
  id: string;
  order_id: string;
  item_id: string;
  item_type: "product" | "reform";
  product_id: number | null;
  selected_option_id: string | null;
  reform_data: {
    tie: {
      id: string;
      image?: string;
      measurementType?: "length" | "height";
      tieLength?: number;
      wearerHeight?: number;
      notes?: string;
      checked?: boolean;
    };
    cost: number;
  } | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  applied_user_coupon_id: string | null;
  created_at: string;
}
