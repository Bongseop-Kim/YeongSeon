import type {
  AdminClaimListRowDTO,
  ClaimStatusLogDTO,
} from "@yeongseon/shared";
import type {
  AdminClaimListItem,
  AdminClaimDetail,
  AdminClaimStatusLogEntry,
  AdminClaimTrackingInfo,
  AdminClaimOrderShipping,
  AdminClaimCustomer,
  AdminClaimLinkedOrder,
  AdminTokenRefundInfo,
} from "@/features/claims/types/admin-claim";

// ── Private helpers ────────────────────────────────────────────

function toReturnTracking(
  dto: AdminClaimListRowDTO,
): AdminClaimTrackingInfo | null {
  if (!dto.returnCourierCompany || !dto.returnTrackingNumber) return null;
  return {
    courierCompany: dto.returnCourierCompany,
    trackingNumber: dto.returnTrackingNumber,
  };
}

function toResendTracking(
  dto: AdminClaimListRowDTO,
): AdminClaimTrackingInfo | null {
  if (!dto.resendCourierCompany || !dto.resendTrackingNumber) return null;
  return {
    courierCompany: dto.resendCourierCompany,
    trackingNumber: dto.resendTrackingNumber,
  };
}

function toOrderShipping(dto: AdminClaimListRowDTO): AdminClaimOrderShipping {
  return {
    orderStatus: dto.orderStatus,
    courierCompany: dto.orderCourierCompany,
    trackingNumber: dto.orderTrackingNumber,
    shippedAt: dto.orderShippedAt,
  };
}

function toCustomer(dto: AdminClaimListRowDTO): AdminClaimCustomer {
  return {
    userId: dto.userId,
    name: dto.customerName,
    phone: dto.customerPhone,
  };
}

function toLinkedOrder(dto: AdminClaimListRowDTO): AdminClaimLinkedOrder {
  return {
    orderId: dto.orderId,
    orderNumber: dto.orderNumber,
  };
}

// ── List mapper ────────────────────────────────────────────────

export function toAdminClaimListItem(
  dto: AdminClaimListRowDTO,
): AdminClaimListItem {
  return {
    id: dto.id,
    claimNumber: dto.claimNumber,
    date: dto.date,
    claimType: dto.type,
    status: dto.status,
    reason: dto.reason,
    customerName: dto.customerName,
    orderNumber: dto.orderNumber,
    productName: dto.productName,
  };
}

// ── Detail mapper ──────────────────────────────────────────────

export function toAdminClaimDetail(
  dto: AdminClaimListRowDTO,
): AdminClaimDetail {
  return {
    id: dto.id,
    claimNumber: dto.claimNumber,
    date: dto.date,
    claimType: dto.type,
    status: dto.status,
    reason: dto.reason,
    description: dto.description,
    claimQuantity: dto.claimQuantity,
    itemType: dto.itemType,
    productName: dto.productName,
    customer: toCustomer(dto),
    linkedOrder: toLinkedOrder(dto),
    orderShipping: toOrderShipping(dto),
    returnTracking: toReturnTracking(dto),
    resendTracking: toResendTracking(dto),
    refundData: dto.refund_data
      ? ({
          paidTokenAmount: dto.refund_data.paid_token_amount,
          bonusTokenAmount: dto.refund_data.bonus_token_amount,
          refundAmount: dto.refund_data.refund_amount,
        } satisfies AdminTokenRefundInfo)
      : null,
  };
}

// ── Status log mapper ─────────────────────────────────────────

export function toAdminClaimStatusLogEntry(
  dto: ClaimStatusLogDTO,
): AdminClaimStatusLogEntry {
  return {
    id: dto.id,
    claimId: dto.claimId,
    changedBy: dto.changedBy,
    previousStatus: dto.previousStatus,
    newStatus: dto.newStatus,
    memo: dto.memo,
    isRollback: dto.isRollback,
    createdAt: dto.createdAt,
  };
}
