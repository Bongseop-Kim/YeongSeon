import type { OrderType } from "../../constants/order-status";

/** admin_order_list_view row */
export interface AdminOrderListRowDTO {
  id: string;
  userId: string;
  orderNumber: string;
  date: string;
  orderType: OrderType;
  status: string;
  totalPrice: number;
  originalPrice: number;
  totalDiscount: number;
  courierCompany: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  created_at: string;
  updated_at: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  fabricType: string | null;
  designType: string | null;
  itemQuantity: number | null;
  reformSummary: string | null;
}

/** admin_order_detail_view row (extends list + shipping address, minus list-only fields) */
export interface AdminOrderDetailRowDTO extends Omit<AdminOrderListRowDTO, 'fabricType' | 'designType' | 'itemQuantity' | 'reformSummary'> {
  recipientName: string | null;
  recipientPhone: string | null;
  shippingAddress: string | null;
  shippingAddressDetail: string | null;
  shippingPostalCode: string | null;
  deliveryMemo: string | null;
  deliveryRequest: string | null;
}

/** admin_order_status_log_view row */
export interface OrderStatusLogDTO {
  id: string;
  orderId: string;
  changedBy: string;
  previousStatus: string;
  newStatus: string;
  memo: string | null;
  createdAt: string;
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
