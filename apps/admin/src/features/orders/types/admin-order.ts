import type { OrderType } from "@yeongseon/shared";

// ── Nested UI types ────────────────────────────────────────────

export interface AdminShippingAddress {
  recipientName: string;
  recipientPhone: string | null;
  postalCode: string | null;
  address: string | null;
  addressDetail: string | null;
  deliveryMemo: string | null;
  deliveryRequest: string | null;
}

export interface AdminTrackingInfo {
  courierCompany: string;
  trackingNumber: string;
  shippedAt: string | null;
}

// ── List UI model ──────────────────────────────────────────────

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  date: string;
  orderType: OrderType;
  status: string;
  totalPrice: number;
  customerName: string;
  customerEmail: string | null;
  // custom-order specific
  fabricType: string | null;
  designType: string | null;
  itemQuantity: number | null;
  // repair specific
  reformSummary: string | null;
}

// ── Detail UI model ────────────────────────────────────────────

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  date: string;
  orderType: OrderType;
  status: string;
  totalPrice: number;
  originalPrice: number;
  totalDiscount: number;
  userId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  shippingAddress: AdminShippingAddress | null;
  trackingInfo: AdminTrackingInfo | null;
}

// ── Order items (discriminated union) ─────────────────────────

export interface AdminProductOrderItem {
  type: "product";
  id: string;
  orderId: string;
  productId: number | null;
  productName: string | null;
  productCode: string | null;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineDiscountAmount: number;
}

export interface AdminReformOrderItem {
  type: "reform";
  id: string;
  orderId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineDiscountAmount: number;
  reformData: CustomOrderReformData | RepairOrderReformData | null;
}

export type AdminOrderItem = AdminProductOrderItem | AdminReformOrderItem;

// ── reformData typed structures ────────────────────────────────

export interface CustomOrderOptions {
  tie_type: string | null;
  interlining: string | null;
  design_type: string | null;
  fabric_type: string | null;
  fabric_provided: boolean;
  triangle_stitch: boolean;
  side_stitch: boolean;
  bar_tack: boolean;
  dimple: boolean;
  spoderato: boolean;
  fold7: boolean;
  brand_label: boolean;
  care_label: boolean;
}

export interface CustomOrderPricing {
  sewing_cost: number;
  fabric_cost: number;
  total_cost: number;
}

export interface CustomOrderReformData {
  readonly _tag: "custom";
  options: CustomOrderOptions;
  pricing: CustomOrderPricing;
  quantity: number;
  sample: boolean;
  reference_image_urls: string[];
  additional_notes: string | null;
}

export interface RepairTie {
  image_url: string | undefined;
  measurement_type: "length" | "height";
  measurement_value: string;
  memo: string | undefined;
}

export interface RepairOrderReformData {
  readonly _tag: "repair";
  ties: RepairTie[];
}

// ── Status log ────────────────────────────────────────────────

export interface AdminStatusLogEntry {
  id: string;
  orderId: string;
  previousStatus: string;
  newStatus: string;
  memo: string | null;
  isRollback: boolean;
  createdAt: string;
}
