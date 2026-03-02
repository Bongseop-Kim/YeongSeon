import type {
  AdminOrderListRowDTO,
  AdminOrderDetailRowDTO,
  AdminOrderItemRowDTO,
  OrderStatusLogDTO,
} from "@yeongseon/shared";
import type {
  AdminOrderListItem,
  AdminOrderDetail,
  AdminOrderItem,
  AdminProductOrderItem,
  AdminReformOrderItem,
  AdminShippingAddress,
  AdminTrackingInfo,
  AdminStatusLogEntry,
  CustomOrderReformData,
  CustomOrderOptions,
  CustomOrderPricing,
  RepairOrderReformData,
  RepairTie,
} from "../types/admin-order";

// ── runtime helpers ────────────────────────────────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string | null =>
  typeof v === "string" ? v : null;

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" ? v : fallback;

const bool = (v: unknown): boolean => v === true;

// ── List mapper ────────────────────────────────────────────────

export function toAdminOrderListItem(
  dto: AdminOrderListRowDTO
): AdminOrderListItem {
  return {
    id: dto.id,
    orderNumber: dto.orderNumber,
    date: dto.date,
    orderType: dto.orderType,
    status: dto.status,
    totalPrice: dto.totalPrice,
    customerName: dto.customerName,
    customerEmail: dto.customerEmail,
    fabricType: dto.fabricType,
    designType: dto.designType,
    itemQuantity: dto.itemQuantity,
    reformSummary: dto.reformSummary,
  };
}

// ── Detail mapper ──────────────────────────────────────────────

function toShippingAddress(
  dto: AdminOrderDetailRowDTO
): AdminShippingAddress | null {
  if (!dto.recipientName) return null;
  return {
    recipientName: dto.recipientName,
    recipientPhone: dto.recipientPhone,
    postalCode: dto.shippingPostalCode,
    address: dto.shippingAddress,
    addressDetail: dto.shippingAddressDetail,
    deliveryMemo: dto.deliveryMemo,
    deliveryRequest: dto.deliveryRequest,
  };
}

function toTrackingInfo(
  dto: AdminOrderDetailRowDTO
): AdminTrackingInfo | null {
  if (!dto.courierCompany || !dto.trackingNumber) return null;
  return {
    courierCompany: dto.courierCompany,
    trackingNumber: dto.trackingNumber,
    shippedAt: dto.shippedAt,
  };
}

export function toAdminOrderDetail(
  dto: AdminOrderDetailRowDTO
): AdminOrderDetail {
  return {
    id: dto.id,
    orderNumber: dto.orderNumber,
    date: dto.date,
    orderType: dto.orderType,
    status: dto.status,
    totalPrice: dto.totalPrice,
    originalPrice: dto.originalPrice,
    totalDiscount: dto.totalDiscount,
    userId: dto.userId,
    customerName: dto.customerName,
    customerPhone: dto.customerPhone,
    customerEmail: dto.customerEmail,
    shippingAddress: toShippingAddress(dto),
    trackingInfo: toTrackingInfo(dto),
  };
}

// ── Order item mapper ──────────────────────────────────────────

export function parseCustomReformData(
  raw: Record<string, unknown>
): CustomOrderReformData {
  const rawOptions = isRecord(raw.options) ? raw.options : {};
  const rawPricing = isRecord(raw.pricing) ? raw.pricing : {};

  const options: CustomOrderOptions = {
    tie_type: str(rawOptions.tie_type),
    interlining: str(rawOptions.interlining),
    design_type: str(rawOptions.design_type),
    fabric_type: str(rawOptions.fabric_type),
    fabric_provided: bool(rawOptions.fabric_provided),
    triangle_stitch: bool(rawOptions.triangle_stitch),
    side_stitch: bool(rawOptions.side_stitch),
    bar_tack: bool(rawOptions.bar_tack),
    dimple: bool(rawOptions.dimple),
    spoderato: bool(rawOptions.spoderato),
    fold7: bool(rawOptions.fold7),
    brand_label: bool(rawOptions.brand_label),
    care_label: bool(rawOptions.care_label),
  };

  const pricing: CustomOrderPricing = {
    sewing_cost: num(rawPricing.sewing_cost),
    fabric_cost: num(rawPricing.fabric_cost),
    total_cost: num(rawPricing.total_cost),
  };

  const refImages = Array.isArray(raw.reference_image_urls)
    ? raw.reference_image_urls.filter((u): u is string => typeof u === "string")
    : [];

  return {
    _tag: "custom",
    options,
    pricing,
    quantity: num(raw.quantity),
    sample: bool(raw.sample),
    reference_image_urls: refImages,
    additional_notes: str(raw.additional_notes),
  };
}

function parseRepairTie(raw: unknown): RepairTie {
  const r = isRecord(raw) ? raw : {};
  const measurementType =
    str(r.measurement_type) === "length" ? "length" : "height";
  return {
    image_url: typeof r.image_url === "string" ? r.image_url : undefined,
    measurement_type: measurementType,
    measurement_value: str(r.measurement_value) ?? "",
    memo: typeof r.memo === "string" ? r.memo : undefined,
  };
}

export function parseRepairReformData(
  raw: Record<string, unknown>
): RepairOrderReformData {
  const ties = Array.isArray(raw.ties)
    ? raw.ties.map(parseRepairTie)
    : [];
  return { _tag: "repair", ties };
}

function toReformData(
  raw: Record<string, unknown> | null,
  orderType: "custom" | "repair"
): CustomOrderReformData | RepairOrderReformData | null {
  if (!raw) return null;
  if (orderType === "custom") return parseCustomReformData(raw);
  return parseRepairReformData(raw);
}

export function toAdminOrderItem(
  dto: AdminOrderItemRowDTO,
  orderType: "sale" | "custom" | "repair"
): AdminOrderItem {
  if (dto.itemType === "product") {
    const item: AdminProductOrderItem = {
      type: "product",
      id: dto.id,
      orderId: dto.orderId,
      productId: dto.productId,
      productName: dto.productName,
      productCode: dto.productCode,
      productImage: dto.productImage,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      discountAmount: dto.discountAmount,
      lineDiscountAmount: dto.lineDiscountAmount,
    };
    return item;
  }

  const reformType = orderType === "sale" ? "custom" : orderType;
  const item: AdminReformOrderItem = {
    type: "reform",
    id: dto.id,
    orderId: dto.orderId,
    quantity: dto.quantity,
    unitPrice: dto.unitPrice,
    discountAmount: dto.discountAmount,
    lineDiscountAmount: dto.lineDiscountAmount,
    reformData: toReformData(dto.reformData, reformType),
  };
  return item;
}

// ── Status log mapper ─────────────────────────────────────────

export function toAdminStatusLogEntry(
  dto: OrderStatusLogDTO
): AdminStatusLogEntry {
  return {
    id: dto.id,
    orderId: dto.orderId,
    previousStatus: dto.previousStatus,
    newStatus: dto.newStatus,
    memo: dto.memo,
    isRollback: dto.isRollback,
    createdAt: dto.createdAt,
  };
}
