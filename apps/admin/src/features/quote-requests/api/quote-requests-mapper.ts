import type {
  AdminQuoteRequestListRowDTO,
  AdminQuoteRequestDetailRowDTO,
  QuoteRequestStatusLogDTO,
} from "@yeongseon/shared";
import type {
  QuoteRequestOptions,
  AdminQuoteRequestListItem,
  AdminQuoteRequestDetail,
  AdminQuoteRequestStatusLog,
} from "../types/admin-quote-request";

// ── Runtime helpers ───────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function bool(v: unknown): boolean {
  return v === true;
}

// ── Options ───────────────────────────────────────────────────

export function toQuoteRequestOptions(
  raw: Record<string, unknown>,
): QuoteRequestOptions {
  return {
    tieType: str(raw.tie_type),
    interlining: str(raw.interlining),
    designType: str(raw.design_type),
    fabricType: str(raw.fabric_type),
    fabricProvided: bool(raw.fabric_provided),
    interliningThickness: str(raw.interlining_thickness),
    triangleStitch: bool(raw.triangle_stitch),
    sideStitch: bool(raw.side_stitch),
    barTack: bool(raw.bar_tack),
    dimple: bool(raw.dimple),
    spoderato: bool(raw.spoderato),
    fold7: bool(raw.fold7),
    brandLabel: bool(raw.brand_label),
    careLabel: bool(raw.care_label),
  };
}

// ── List ──────────────────────────────────────────────────────

export function toAdminQuoteRequestListItem(
  dto: AdminQuoteRequestListRowDTO,
): AdminQuoteRequestListItem {
  return {
    id: dto.id,
    quoteNumber: dto.quoteNumber,
    date: dto.date,
    status: dto.status,
    quantity: dto.quantity,
    quotedAmount: dto.quotedAmount,
    customerName: dto.customerName,
    contactName: dto.contactName,
    contactMethod: dto.contactMethod,
  };
}

// ── Detail ────────────────────────────────────────────────────

export function toAdminQuoteRequestDetail(
  dto: AdminQuoteRequestDetailRowDTO,
): AdminQuoteRequestDetail {
  return {
    id: dto.id,
    userId: dto.userId,
    quoteNumber: dto.quoteNumber,
    date: dto.date,
    status: dto.status,
    quantity: dto.quantity,
    options: toQuoteRequestOptions(dto.options),
    referenceImageUrls: (dto.referenceImages ?? []).map((img) => img.url),
    additionalNotes: dto.additionalNotes,
    contactName: dto.contactName,
    contactTitle: dto.contactTitle,
    contactMethod: dto.contactMethod,
    contactValue: dto.contactValue,
    quotedAmount: dto.quotedAmount,
    quoteConditions: dto.quoteConditions,
    adminMemo: dto.adminMemo,
    customerName: dto.customerName,
    customerPhone: dto.customerPhone,
    customerEmail: dto.customerEmail,
    recipientName: dto.recipientName,
    recipientPhone: dto.recipientPhone,
    shippingAddress: dto.shippingAddress,
    shippingAddressDetail: dto.shippingAddressDetail,
    shippingPostalCode: dto.shippingPostalCode,
    deliveryMemo: dto.deliveryMemo,
    deliveryRequest: dto.deliveryRequest,
  };
}

// ── Status log ────────────────────────────────────────────────

export function toAdminQuoteRequestStatusLog(
  dto: QuoteRequestStatusLogDTO,
): AdminQuoteRequestStatusLog {
  return {
    id: dto.id,
    previousStatus: dto.previousStatus,
    newStatus: dto.newStatus,
    memo: dto.memo,
    createdAt: dto.createdAt,
  };
}
