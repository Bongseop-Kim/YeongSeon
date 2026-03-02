import type { ClaimType } from "@yeongseon/shared";

// ── Nested value objects ────────────────────────────────────────

export interface AdminClaimTrackingInfo {
  courierCompany: string;
  trackingNumber: string;
}

export interface AdminClaimOrderShipping {
  orderStatus: string;
  courierCompany: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
}

export interface AdminClaimCustomer {
  userId: string;
  name: string;
  phone: string | null;
}

export interface AdminClaimLinkedOrder {
  orderId: string;
  orderNumber: string;
}

// ── List UI model ──────────────────────────────────────────────

export interface AdminClaimListItem {
  id: string;
  claimNumber: string;
  date: string;
  claimType: ClaimType;
  status: string;
  reason: string;
  customerName: string;
  orderNumber: string;
  productName: string | null;
}

// ── Detail UI model ────────────────────────────────────────────

export interface AdminClaimDetail {
  id: string;
  claimNumber: string;
  date: string;
  claimType: ClaimType;
  status: string;
  reason: string;
  description: string | null;
  claimQuantity: number;
  itemType: "product" | "reform";
  productName: string | null;
  customer: AdminClaimCustomer;
  linkedOrder: AdminClaimLinkedOrder;
  orderShipping: AdminClaimOrderShipping;
  returnTracking: AdminClaimTrackingInfo | null;
  resendTracking: AdminClaimTrackingInfo | null;
}

// ── Status log ────────────────────────────────────────────────

export interface AdminClaimStatusLogEntry {
  id: string;
  claimId: string;
  changedBy: string;
  previousStatus: string;
  newStatus: string;
  memo: string | null;
  isRollback: boolean;
  createdAt: string;
}
