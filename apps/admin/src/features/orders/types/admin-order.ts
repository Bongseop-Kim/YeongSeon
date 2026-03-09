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
  deliveredAt: string | null;
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
  deliveredAt: string | null;
  confirmedAt: string | null;
  paymentGroupId: string | null;
  shippingCost: number;
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

export interface AdminCustomOrderItem {
  type: "custom";
  id: string;
  orderId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineDiscountAmount: number;
  reformData: CustomOrderReformData | null;
}

export interface AdminReformOrderItem {
  type: "reform";
  id: string;
  orderId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineDiscountAmount: number;
  reformData: RepairOrderReformData | null;
}

export type AdminOrderItem = AdminProductOrderItem | AdminCustomOrderItem | AdminReformOrderItem;

// ── reformData typed structures ────────────────────────────────

export interface CustomOrderOptions {
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
}

export interface CustomOrderPricing {
  sewingCost: number;
  fabricCost: number;
  totalCost: number;
}

export interface CustomOrderReformData {
  readonly _tag: "custom";
  options: CustomOrderOptions;
  pricing: CustomOrderPricing;
  quantity: number;
  sample: boolean;
  referenceImageUrls: string[];
  additionalNotes: string | null;
}

export interface RepairTie {
  imageUrl: string | null;
  measurementType: "length" | "height";
  measurementValue: string;
  memo: string | null;
}

export interface RepairOrderReformData {
  readonly _tag: "repair";
  ties: RepairTie[];
}

// ── type guards ────────────────────────────────────────────────

export function isCustomReformData(
  value: CustomOrderReformData | RepairOrderReformData | null | undefined
): value is CustomOrderReformData {
  return value?._tag === "custom";
}

export function isRepairReformData(
  value: CustomOrderReformData | RepairOrderReformData | null | undefined
): value is RepairOrderReformData {
  return value?._tag === "repair";
}

// ── Status log ────────────────────────────────────────────────

export interface AdminStatusLogEntry {
  id: string;
  orderId: string;
  changedBy: string | null;
  previousStatus: string;
  newStatus: string;
  memo: string | null;
  isRollback: boolean;
  createdAt: string;
}
