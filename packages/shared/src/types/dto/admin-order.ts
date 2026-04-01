import type { OrderType } from "../../constants/order-status";
import type { ClaimStatus, ClaimType } from "../view/claim-item";
import type { AdminAction } from "../view/order-actions";

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
  deliveredAt: string | null;
  confirmedAt: string | null;
  companyCourierCompany: string | null;
  companyTrackingNumber: string | null;
  companyShippedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  fabricType: string | null;
  designType: string | null;
  itemQuantity: number | null;
  reformSummary: string | null;
  paymentGroupId: string | null;
  shippingCost: number;
  isSample: boolean | null;
  sampleType: string | null;
}

/** admin_order_detail_view row (extends list + shipping address, minus list-only fields) */
export interface AdminActiveClaimSummaryDTO {
  id: string;
  claimNumber: string;
  type: ClaimType;
  status: ClaimStatus;
  quantity: number;
}

export interface AdminOrderDetailRowDTO extends Omit<
  AdminOrderListRowDTO,
  | "fabricType"
  | "designType"
  | "itemQuantity"
  | "reformSummary"
  | "isSample"
  | "sampleType"
> {
  recipientName: string | null;
  recipientPhone: string | null;
  shippingAddress: string | null;
  shippingAddressDetail: string | null;
  shippingPostalCode: string | null;
  deliveryMemo: string | null;
  deliveryRequest: string | null;
  activeClaimId: string | null;
  activeClaimNumber: string | null;
  activeClaimType: ClaimType | null;
  activeClaimStatus: ClaimStatus | null;
  activeClaimQuantity: number | null;
  adminActions: AdminAction[];
}

/** admin_order_status_log_view row */
export interface OrderStatusLogDTO {
  id: string;
  orderId: string;
  changedBy: string | null;
  previousStatus: string;
  newStatus: string;
  memo: string | null;
  isRollback: boolean;
  createdAt: string;
}

interface AdminOrderItemRowBaseDTO {
  id: string;
  orderId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineDiscountAmount: number;
  appliedUserCouponId: string | null;
  created_at: string;
}

export interface AdminProductOrderItemRowDTO extends AdminOrderItemRowBaseDTO {
  itemType: "product";
  productId: number | null;
  selectedOptionId: string | null;
  reformData: null;
  productName: string | null;
  productCode: string | null;
  productImage: string | null;
}

interface AdminNonProductOrderItemRowBaseDTO extends AdminOrderItemRowBaseDTO {
  productId: null;
  selectedOptionId: null;
  reformData: Record<string, unknown> | null;
  productName: null;
  productCode: null;
  productImage: null;
}

export interface AdminCustomOrderItemRowDTO extends AdminNonProductOrderItemRowBaseDTO {
  itemType: "custom";
}

export interface AdminReformOrderItemRowDTO extends AdminNonProductOrderItemRowBaseDTO {
  itemType: "reform";
}

export interface AdminTokenOrderItemRowDTO extends AdminNonProductOrderItemRowBaseDTO {
  itemType: "token";
}

export interface AdminSampleOrderItemRowDTO extends AdminNonProductOrderItemRowBaseDTO {
  itemType: "sample";
}

/** admin_order_item_view row */
export type AdminOrderItemRowDTO =
  | AdminProductOrderItemRowDTO
  | AdminCustomOrderItemRowDTO
  | AdminReformOrderItemRowDTO
  | AdminSampleOrderItemRowDTO
  | AdminTokenOrderItemRowDTO;
