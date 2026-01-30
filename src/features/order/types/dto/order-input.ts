export interface CreateOrderItemInputDTO {
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
}

export interface CreateOrderInputDTO {
  p_shipping_address_id: string;
  p_total_price: number;
  p_original_price: number;
  p_total_discount: number;
  p_order_items: CreateOrderItemInputDTO[];
}
