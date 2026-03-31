import type {
  AdminOrderListRowDTO,
  AdminOrderDetailRowDTO,
  AdminOrderItemRowDTO,
  OrderStatusLogDTO,
  OrderType,
} from "@yeongseon/shared";
import type {
  AdminOrderListItem,
  AdminOrderDetail,
  AdminOrderItem,
  AdminProductOrderItem,
  AdminCustomOrderItem,
  AdminReformOrderItem,
  AdminTokenOrderItem,
  AdminSampleOrderItem,
  AdminShippingAddress,
  AdminTrackingInfo,
  AdminStatusLogEntry,
  CustomOrderReformData,
  CustomOrderOptions,
  CustomOrderPricing,
  RepairOrderReformData,
  RepairTie,
} from "@/features/orders/types/admin-order";

// ── ValidationError ────────────────────────────────────────────

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// ── runtime helpers ────────────────────────────────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

const bool = (v: unknown): boolean => v === true;

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

// ── List mapper ────────────────────────────────────────────────

export function toAdminOrderListItem(
  dto: AdminOrderListRowDTO,
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
    isSample: dto.isSample,
    sampleType: dto.sampleType,
    reformSummary: dto.reformSummary,
  };
}

// ── Detail mapper ──────────────────────────────────────────────

function toShippingAddress(
  dto: AdminOrderDetailRowDTO,
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

function toTrackingInfo(dto: AdminOrderDetailRowDTO): AdminTrackingInfo | null {
  const hasCustomerTracking = dto.courierCompany || dto.trackingNumber;
  const hasCompanyTracking =
    dto.companyCourierCompany || dto.companyTrackingNumber;

  if (!hasCustomerTracking && !hasCompanyTracking) return null;

  return {
    courierCompany: dto.courierCompany ?? null,
    trackingNumber: dto.trackingNumber ?? null,
    shippedAt: dto.shippedAt ?? null,
    deliveredAt: dto.deliveredAt ?? null,
    companyCourierCompany: dto.companyCourierCompany ?? null,
    companyTrackingNumber: dto.companyTrackingNumber ?? null,
    companyShippedAt: dto.companyShippedAt ?? null,
  };
}

export function toAdminOrderDetail(
  dto: AdminOrderDetailRowDTO,
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
    deliveredAt: dto.deliveredAt,
    confirmedAt: dto.confirmedAt,
    paymentGroupId: dto.paymentGroupId,
    shippingCost: dto.shippingCost,
    adminActions: Array.isArray(dto.adminActions) ? dto.adminActions : [],
  };
}

// ── Order item mapper ──────────────────────────────────────────

export function parseCustomReformData(
  raw: Record<string, unknown>,
): CustomOrderReformData {
  const rawOptions = isRecord(raw.options) ? raw.options : {};
  const rawPricing = isRecord(raw.pricing) ? raw.pricing : {};

  const rawQuantity = raw.quantity;
  if (typeof rawQuantity === "undefined") {
    console.warn(
      "[parseCustomReformData] quantity 필드가 없습니다. 0으로 대체합니다.",
      raw,
    );
  } else if (
    typeof rawQuantity !== "number" ||
    !Number.isFinite(rawQuantity) ||
    rawQuantity <= 0
  ) {
    throw new ValidationError(
      `주문 제작 reformData 검증 실패: quantity가 유한한 양수가 아닙니다 (${rawQuantity}).`,
    );
  }
  const quantity = typeof rawQuantity === "number" ? rawQuantity : 0;

  const sewingCost = rawPricing.sewing_cost;
  const fabricCost = rawPricing.fabric_cost;
  const totalCost = rawPricing.total_cost;
  const invalidPricingFields: string[] = [];

  const validatedSewingCost = isFiniteNumber(sewingCost) ? sewingCost : null;
  const validatedFabricCost = isFiniteNumber(fabricCost) ? fabricCost : null;
  const validatedTotalCost = isFiniteNumber(totalCost) ? totalCost : null;

  if (validatedSewingCost === null) {
    invalidPricingFields.push("pricing.sewing_cost");
  }
  if (validatedFabricCost === null) {
    invalidPricingFields.push("pricing.fabric_cost");
  }
  if (validatedTotalCost === null) {
    invalidPricingFields.push("pricing.total_cost");
  }
  if (invalidPricingFields.length > 0) {
    throw new ValidationError(
      `주문 제작 reformData 검증 실패: 유효하지 않은 pricing 필드 (${invalidPricingFields.join(", ")}).`,
    );
  }
  if (
    validatedSewingCost === null ||
    validatedFabricCost === null ||
    validatedTotalCost === null
  ) {
    throw new ValidationError(
      "주문 제작 reformData 검증 실패: pricing 검증 결과가 일관되지 않습니다.",
    );
  }

  const options: CustomOrderOptions = {
    tieType: str(rawOptions.tie_type),
    interlining: str(rawOptions.interlining),
    designType: str(rawOptions.design_type),
    fabricType: str(rawOptions.fabric_type),
    fabricProvided: bool(rawOptions.fabric_provided),
    triangleStitch: bool(rawOptions.triangle_stitch),
    sideStitch: bool(rawOptions.side_stitch),
    barTack: bool(rawOptions.bar_tack),
    dimple: bool(rawOptions.dimple),
    spoderato: bool(rawOptions.spoderato),
    fold7: bool(rawOptions.fold7),
    brandLabel: bool(rawOptions.brand_label),
    careLabel: bool(rawOptions.care_label),
  };

  const pricing: CustomOrderPricing = {
    sewingCost: validatedSewingCost,
    fabricCost: validatedFabricCost,
    totalCost: validatedTotalCost,
  };

  const refImages = Array.isArray(raw.reference_images)
    ? raw.reference_images
        .filter(
          (item): item is { url: string; file_id: string | null } =>
            item !== null &&
            typeof item === "object" &&
            typeof item.url === "string" &&
            "file_id" in item &&
            (typeof item.file_id === "string" || item.file_id === null),
        )
        .map((item) => item.url)
    : [];

  return {
    _tag: "custom",
    options,
    pricing,
    quantity,
    sample: bool(raw.sample),
    sampleType: str(raw.sample_type),
    referenceImageUrls: refImages,
    additionalNotes: str(raw.additional_notes),
  };
}

function parseSampleData(
  raw: Record<string, unknown>,
): AdminSampleOrderItem["sampleData"] {
  const rawOptions = isRecord(raw.options) ? raw.options : {};
  const rawPricing = isRecord(raw.pricing) ? raw.pricing : {};
  const sampleType = raw.sample_type;
  const totalCost = rawPricing.total_cost;

  if (
    sampleType !== "fabric" &&
    sampleType !== "sewing" &&
    sampleType !== "fabric_and_sewing"
  ) {
    throw new ValidationError("샘플 주문 sample_type이 올바르지 않습니다.");
  }

  if (!isFiniteNumber(totalCost)) {
    throw new ValidationError(
      "샘플 주문 pricing.total_cost가 올바르지 않습니다.",
    );
  }

  const refImages = Array.isArray(raw.reference_images)
    ? raw.reference_images
        .filter(
          (item): item is { url: string } =>
            item !== null &&
            typeof item === "object" &&
            typeof item.url === "string",
        )
        .map((item) => item.url)
    : [];

  return {
    sampleType,
    options: {
      fabricType: str(rawOptions.fabric_type),
      designType: str(rawOptions.design_type),
      tieType: str(rawOptions.tie_type),
      interlining: str(rawOptions.interlining),
    },
    pricing: {
      totalCost,
    },
    referenceImageUrls: refImages,
    additionalNotes: str(raw.additional_notes),
  };
}

function parseRepairTie(raw: unknown): RepairTie {
  const r = isRecord(raw) ? raw : {};
  const rawType = str(r.measurementType);
  const measurementType: "length" | "height" =
    rawType === "length" || rawType === "height"
      ? rawType
      : r.tieLength != null
        ? "length"
        : "height";
  if (rawType !== "length" && rawType !== "height") {
    console.warn(`[parseRepairTie] Invalid measurementType: ${rawType}`);
  }

  const rawMeasurementValue =
    measurementType === "length" ? r.tieLength : r.wearerHeight;
  const measurementValue =
    str(rawMeasurementValue) ??
    (typeof rawMeasurementValue === "number"
      ? String(rawMeasurementValue)
      : "");

  return {
    imageUrl: typeof r.image === "string" ? r.image : null,
    measurementType,
    measurementValue,
    memo: typeof r.notes === "string" ? r.notes : null,
  };
}

export function parseRepairReformData(
  raw: Record<string, unknown>,
): RepairOrderReformData {
  const ties =
    typeof raw.tie === "object" && raw.tie !== null && !Array.isArray(raw.tie)
      ? [parseRepairTie(raw.tie)]
      : [];
  return { _tag: "repair", ties };
}

function toReformData(
  raw: Record<string, unknown> | null,
  orderType: "custom",
): CustomOrderReformData | null;
function toReformData(
  raw: Record<string, unknown> | null,
  orderType: "repair",
): RepairOrderReformData | null;
function toReformData(
  raw: Record<string, unknown> | null,
  orderType: "custom" | "repair",
): CustomOrderReformData | RepairOrderReformData | null {
  if (!raw) return null;
  try {
    if (orderType === "custom") return parseCustomReformData(raw);
    return parseRepairReformData(raw);
  } catch (error) {
    if (error instanceof ValidationError) {
      return null;
    }
    throw error;
  }
}

export function toAdminOrderItem(
  dto: AdminOrderItemRowDTO,
  orderType: OrderType,
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

  if (dto.itemType === "custom") {
    const customData = toReformData(dto.reformData, "custom");
    const item: AdminCustomOrderItem = {
      type: "custom",
      id: dto.id,
      orderId: dto.orderId,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      discountAmount: dto.discountAmount,
      lineDiscountAmount: dto.lineDiscountAmount,
      customData,
    };
    return item;
  }

  if (dto.itemType === "reform") {
    const reformData =
      orderType === "sale" ? null : toReformData(dto.reformData, "repair");
    const item: AdminReformOrderItem = {
      type: "reform",
      id: dto.id,
      orderId: dto.orderId,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      discountAmount: dto.discountAmount,
      lineDiscountAmount: dto.lineDiscountAmount,
      reformData,
    };
    return item;
  }

  if (dto.itemType === "token") {
    const reformData = isRecord(dto.reformData) ? dto.reformData : null;
    const item: AdminTokenOrderItem = {
      type: "token",
      id: dto.id,
      orderId: dto.orderId,
      planKey:
        reformData && typeof reformData.plan_key === "string"
          ? reformData.plan_key
          : null,
      tokenAmount:
        reformData && typeof reformData.token_amount === "number"
          ? reformData.token_amount
          : null,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      discountAmount: dto.discountAmount,
      lineDiscountAmount: dto.lineDiscountAmount,
    };
    return item;
  }

  if (dto.itemType === "sample") {
    let sampleData: AdminSampleOrderItem["sampleData"] = null;
    if (isRecord(dto.reformData)) {
      try {
        sampleData = parseSampleData(dto.reformData);
      } catch (error) {
        if (!(error instanceof ValidationError)) {
          throw error;
        }
      }
    }
    const item: AdminSampleOrderItem = {
      type: "sample",
      id: dto.id,
      orderId: dto.orderId,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      discountAmount: dto.discountAmount,
      lineDiscountAmount: dto.lineDiscountAmount,
      sampleData,
    };
    return item;
  }

  const unreachable: never = dto;
  const d = unreachable as { itemType: unknown; orderId: unknown; id: unknown };
  throw new ValidationError(
    `toAdminOrderItem: 알 수 없는 itemType "${d.itemType}" (orderId: ${d.orderId}, id: ${d.id})`,
  );
}

// ── Status log mapper ─────────────────────────────────────────

export function toAdminStatusLogEntry(
  dto: OrderStatusLogDTO,
): AdminStatusLogEntry {
  return {
    id: dto.id,
    orderId: dto.orderId,
    changedBy: dto.changedBy,
    previousStatus: dto.previousStatus,
    newStatus: dto.newStatus,
    memo: dto.memo,
    isRollback: dto.isRollback,
    createdAt: dto.createdAt,
  };
}
