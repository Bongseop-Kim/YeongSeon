/**
 * DB 레코드 타입
 * TieItem의 image는 File이므로 DB에는 URL 문자열로 저장
 */
export interface CartItemRecord {
  id: string;
  user_id: string;
  item_id: string;
  item_type: "product" | "reform";
  product_id: number | null;
  selected_option_id: string | null;
  reform_data: {
    tie: {
      id: string;
      image?: string; // DB에는 URL 문자열로 저장 (File은 스토리지에 저장)
      measurementType?: "length" | "height";
      tieLength?: number;
      wearerHeight?: number;
      notes?: string;
      checked?: boolean;
    };
    cost: number;
  } | null;
  quantity: number;
  applied_coupon_id: string | null;
  created_at: string;
  updated_at: string;
}
