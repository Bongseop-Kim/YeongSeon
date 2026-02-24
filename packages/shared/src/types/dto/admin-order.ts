/** admin_order_list_view row */
export interface AdminOrderListRowDTO {
  id: string;
  userId: string;
  orderNumber: string;
  date: string;
  status: string;
  totalPrice: number;
  originalPrice: number;
  totalDiscount: number;
  created_at: string;
  updated_at: string;
  customerName: string;
  customerPhone: string | null;
}

/** admin_order_item_view row */
export interface AdminOrderItemRowDTO {
  id: string;
  orderId: string;
  itemId: string;
  itemType: "product" | "reform";
  productId: number | null;
  selectedOptionId: string | null;
  reformData: Record<string, unknown> | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineDiscountAmount: number;
  appliedUserCouponId: string | null;
  created_at: string;
  productName: string | null;
  productCode: string | null;
  productImage: string | null;
}
