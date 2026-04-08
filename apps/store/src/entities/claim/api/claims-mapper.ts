import type {
  ClaimItemRowDTO,
  ClaimListRowDTO,
  ClaimStatusDTO,
  ClaimTypeDTO,
} from "@yeongseon/shared/types/dto/claim-view";
import type { CreateClaimInputDTO } from "@yeongseon/shared/types/dto/claim-input";
import type { CreateClaimResultDTO } from "@yeongseon/shared/types/dto/claim-output";
import type { ClaimItem } from "@yeongseon/shared/types/view/claim-item";
import type { OrderItem } from "@yeongseon/shared/types/view/order";
import type { CreateClaimRequest } from "@yeongseon/shared/types/view/claim-input";
import {
  normalizeItemRow,
  parseCustomOrderData,
  toOrderItemView,
} from "@yeongseon/shared/mappers/shared-mapper";
import {
  isDiscountType,
  isProductCategory,
  isProductColor,
  isProductMaterial,
  isProductPattern,
  isTieMeasurementType,
  isUserCouponStatus,
} from "@/shared/lib/domain-type-guards";
import { isRecord } from "@/shared/lib/type-guard";

// ── parse helpers (런타임 검증) ──────────────────────

const parseClaimItemField = (
  v: unknown,
  i: number,
): ClaimListRowDTO["item"] => {
  if (!isRecord(v)) {
    throw new Error(
      `클레임 목록 행(${i})이 올바르지 않습니다: item 객체가 아닙니다.`,
    );
  }
  if (
    typeof v.id !== "string" ||
    (v.type !== "product" &&
      v.type !== "reform" &&
      v.type !== "custom" &&
      v.type !== "token") ||
    typeof v.quantity !== "number"
  ) {
    throw new Error(
      `클레임 목록 행(${i})의 item이 올바르지 않습니다: 필수 필드(id, type, quantity) 누락 또는 type 값 오류.`,
    );
  }
  if (v.type === "product" && v.product == null) {
    throw new Error(
      `클레임 목록 행(${i})의 item이 올바르지 않습니다: type이 "product"인 경우 product 필드가 있어야 합니다.`,
    );
  }
  if (v.type === "reform" && v.reformData == null) {
    throw new Error(
      `클레임 목록 행(${i})의 item이 올바르지 않습니다: type이 "reform"인 경우 reformData 필드가 있어야 합니다.`,
    );
  }
  if (v.type === "custom" && v.reformData == null) {
    throw new Error(
      `클레임 목록 행(${i})의 item이 올바르지 않습니다: type이 "custom"인 경우 reformData(custom) 필드가 있어야 합니다.`,
    );
  }
  let product: ClaimItemRowDTO["product"] = null;
  if (v.product != null) {
    if (
      !isRecord(v.product) ||
      typeof v.product.id !== "number" ||
      typeof v.product.code !== "string" ||
      typeof v.product.name !== "string" ||
      typeof v.product.price !== "number" ||
      typeof v.product.image !== "string" ||
      typeof v.product.category !== "string" ||
      typeof v.product.color !== "string" ||
      typeof v.product.pattern !== "string" ||
      typeof v.product.material !== "string" ||
      typeof v.product.likes !== "number" ||
      typeof v.product.info !== "string"
    ) {
      throw new Error(
        `클레임 목록 행(${i})의 item.product가 올바르지 않습니다: 필수 필드(id, code, name, price, image, category, color, pattern, material, likes, info) 누락.`,
      );
    }
    if (!isProductCategory(v.product.category)) {
      throw new Error(
        `클레임 목록 행(${i})의 item.product가 올바르지 않습니다: category 값(${v.product.category})이 허용된 값이 아닙니다.`,
      );
    }
    if (!isProductColor(v.product.color)) {
      throw new Error(
        `클레임 목록 행(${i})의 item.product가 올바르지 않습니다: color 값(${v.product.color})이 허용된 값이 아닙니다.`,
      );
    }
    if (!isProductPattern(v.product.pattern)) {
      throw new Error(
        `클레임 목록 행(${i})의 item.product가 올바르지 않습니다: pattern 값(${v.product.pattern})이 허용된 값이 아닙니다.`,
      );
    }
    if (!isProductMaterial(v.product.material)) {
      throw new Error(
        `클레임 목록 행(${i})의 item.product가 올바르지 않습니다: material 값(${v.product.material})이 허용된 값이 아닙니다.`,
      );
    }
    product = {
      id: v.product.id,
      code: v.product.code,
      name: v.product.name,
      price: v.product.price,
      image: v.product.image,
      category: v.product.category,
      color: v.product.color,
      pattern: v.product.pattern,
      material: v.product.material,
      likes: v.product.likes,
      info: v.product.info,
    };
  }

  let selectedOption: ClaimItemRowDTO["selectedOption"] = null;
  if (v.selectedOption != null) {
    if (
      !isRecord(v.selectedOption) ||
      typeof v.selectedOption.id !== "string" ||
      typeof v.selectedOption.name !== "string" ||
      typeof v.selectedOption.additionalPrice !== "number"
    ) {
      throw new Error(
        `클레임 목록 행(${i})의 item.selectedOption이 올바르지 않습니다: 필수 필드(id, name, additionalPrice) 누락.`,
      );
    }
    selectedOption = {
      id: v.selectedOption.id,
      name: v.selectedOption.name,
      additionalPrice: v.selectedOption.additionalPrice,
    };
  }

  let reformData: ClaimItemRowDTO["reformData"] = null;
  if (v.type === "reform") {
    if (v.reformData != null) {
      if (
        !isRecord(v.reformData) ||
        typeof v.reformData.cost !== "number" ||
        !isRecord(v.reformData.tie)
      ) {
        throw new Error(
          `클레임 목록 행(${i})의 item.reformData가 올바르지 않습니다: 필수 필드 누락.`,
        );
      }
      if (
        typeof v.reformData.tie.id !== "string" ||
        (v.reformData.tie.image != null &&
          typeof v.reformData.tie.image !== "string")
      ) {
        throw new Error(
          `클레임 목록 행(${i})의 item.reformData.tie가 올바르지 않습니다: id 또는 image 필드 타입 오류.`,
        );
      }
      if (v.reformData.tie.measurementType != null) {
        if (typeof v.reformData.tie.measurementType !== "string") {
          throw new Error(
            `클레임 목록 행(${i})의 item.reformData.tie가 올바르지 않습니다: measurementType 필드 타입 오류.`,
          );
        }
        if (!isTieMeasurementType(v.reformData.tie.measurementType)) {
          throw new Error(
            `클레임 목록 행(${i})의 item.reformData.tie가 올바르지 않습니다: measurementType 값(${v.reformData.tie.measurementType})이 허용된 값이 아닙니다.`,
          );
        }
      }
      if (
        v.reformData.tie.tieLength != null &&
        typeof v.reformData.tie.tieLength !== "number"
      ) {
        throw new Error(
          `클레임 목록 행(${i})의 item.reformData.tie가 올바르지 않습니다: tieLength 필드 타입 오류.`,
        );
      }
      if (
        v.reformData.tie.wearerHeight != null &&
        typeof v.reformData.tie.wearerHeight !== "number"
      ) {
        throw new Error(
          `클레임 목록 행(${i})의 item.reformData.tie가 올바르지 않습니다: wearerHeight 필드 타입 오류.`,
        );
      }
      if (
        v.reformData.tie.notes != null &&
        typeof v.reformData.tie.notes !== "string"
      ) {
        throw new Error(
          `클레임 목록 행(${i})의 item.reformData.tie가 올바르지 않습니다: notes 필드 타입 오류.`,
        );
      }
      if (
        v.reformData.tie.hasLengthReform != null &&
        typeof v.reformData.tie.hasLengthReform !== "boolean"
      ) {
        throw new Error(
          `클레임 목록 행(${i})의 item.reformData.tie가 올바르지 않습니다: hasLengthReform 필드 타입 오류.`,
        );
      }
      if (
        v.reformData.tie.hasWidthReform != null &&
        typeof v.reformData.tie.hasWidthReform !== "boolean"
      ) {
        throw new Error(
          `클레임 목록 행(${i})의 item.reformData.tie가 올바르지 않습니다: hasWidthReform 필드 타입 오류.`,
        );
      }
      if (
        v.reformData.tie.targetWidth != null &&
        typeof v.reformData.tie.targetWidth !== "number"
      ) {
        throw new Error(
          `클레임 목록 행(${i})의 item.reformData.tie가 올바르지 않습니다: targetWidth 필드 타입 오류.`,
        );
      }
      if (
        v.reformData.tie.checked != null &&
        typeof v.reformData.tie.checked !== "boolean"
      ) {
        throw new Error(
          `클레임 목록 행(${i})의 item.reformData.tie가 올바르지 않습니다: checked 필드 타입 오류.`,
        );
      }
      reformData = {
        cost: v.reformData.cost,
        tie: {
          id: v.reformData.tie.id,
          image:
            typeof v.reformData.tie.image === "string"
              ? v.reformData.tie.image
              : undefined,
          measurementType:
            typeof v.reformData.tie.measurementType === "string"
              ? v.reformData.tie.measurementType
              : undefined,
          tieLength:
            typeof v.reformData.tie.tieLength === "number"
              ? v.reformData.tie.tieLength
              : undefined,
          wearerHeight:
            typeof v.reformData.tie.wearerHeight === "number"
              ? v.reformData.tie.wearerHeight
              : undefined,
          notes:
            typeof v.reformData.tie.notes === "string"
              ? v.reformData.tie.notes
              : undefined,
          hasLengthReform:
            typeof v.reformData.tie.hasLengthReform === "boolean"
              ? v.reformData.tie.hasLengthReform
              : undefined,
          hasWidthReform:
            typeof v.reformData.tie.hasWidthReform === "boolean"
              ? v.reformData.tie.hasWidthReform
              : undefined,
          targetWidth:
            typeof v.reformData.tie.targetWidth === "number"
              ? v.reformData.tie.targetWidth
              : undefined,
        },
      };
    }
  }

  let appliedCoupon: ClaimItemRowDTO["appliedCoupon"] = null;
  if (v.appliedCoupon != null) {
    if (
      !isRecord(v.appliedCoupon) ||
      typeof v.appliedCoupon.id !== "string" ||
      typeof v.appliedCoupon.userId !== "string" ||
      typeof v.appliedCoupon.couponId !== "string" ||
      typeof v.appliedCoupon.status !== "string" ||
      typeof v.appliedCoupon.issuedAt !== "string" ||
      !isRecord(v.appliedCoupon.coupon) ||
      typeof v.appliedCoupon.coupon.id !== "string" ||
      typeof v.appliedCoupon.coupon.name !== "string"
    ) {
      throw new Error(
        `클레임 목록 행(${i})의 item.appliedCoupon이 올바르지 않습니다: 필수 필드(id, userId, couponId, status, issuedAt, coupon.id, coupon.name) 누락.`,
      );
    }
    if (
      typeof v.appliedCoupon.coupon.discountType !== "string" ||
      typeof v.appliedCoupon.coupon.discountValue !== "number" ||
      typeof v.appliedCoupon.coupon.expiryDate !== "string"
    ) {
      throw new Error(
        `클레임 목록 행(${i})의 item.appliedCoupon.coupon이 올바르지 않습니다: 필수 필드(discountType, discountValue, expiryDate) 누락.`,
      );
    }
    if (!isUserCouponStatus(v.appliedCoupon.status)) {
      throw new Error(
        `클레임 목록 행(${i})의 item.appliedCoupon이 올바르지 않습니다: status 값(${v.appliedCoupon.status})이 허용된 상태가 아닙니다.`,
      );
    }
    if (!isDiscountType(v.appliedCoupon.coupon.discountType)) {
      throw new Error(
        `클레임 목록 행(${i})의 item.appliedCoupon.coupon이 올바르지 않습니다: discountType 값(${v.appliedCoupon.coupon.discountType})이 허용된 값이 아닙니다.`,
      );
    }
    appliedCoupon = {
      id: v.appliedCoupon.id,
      userId: v.appliedCoupon.userId,
      couponId: v.appliedCoupon.couponId,
      status: v.appliedCoupon.status,
      issuedAt: v.appliedCoupon.issuedAt,
      expiresAt:
        typeof v.appliedCoupon.expiresAt === "string"
          ? v.appliedCoupon.expiresAt
          : null,
      usedAt:
        typeof v.appliedCoupon.usedAt === "string"
          ? v.appliedCoupon.usedAt
          : null,
      coupon: {
        id: v.appliedCoupon.coupon.id,
        name: v.appliedCoupon.coupon.name,
        discountType: v.appliedCoupon.coupon.discountType,
        discountValue: v.appliedCoupon.coupon.discountValue,
        expiryDate: v.appliedCoupon.coupon.expiryDate,
      },
    };
  }

  let customData: ClaimItemRowDTO["customData"] = null;
  if (v.type === "custom" && v.reformData != null) {
    const raw = v.reformData;
    if (!isRecord(raw)) {
      throw new Error(
        `클레임 목록 행(${i})의 item.reformData(custom)가 올바르지 않습니다: custom 타입의 reformData가 객체가 아닙니다 (item id: ${v.id}).`,
      );
    }
    customData = parseCustomOrderData(raw);
  }

  return {
    id: v.id,
    type: v.type,
    quantity: v.quantity,
    product,
    selectedOption,
    reformData,
    customData,
    appliedCoupon,
  };
};

const CLAIM_STATUSES: ReadonlySet<string> = new Set([
  "접수",
  "처리중",
  "수거요청",
  "수거완료",
  "재발송",
  "완료",
  "거부",
]);
const isClaimStatus = (v: string): v is ClaimStatusDTO => CLAIM_STATUSES.has(v);

const CLAIM_TYPES: ReadonlySet<string> = new Set([
  "cancel",
  "return",
  "exchange",
  "token_refund",
]);
const isClaimType = (v: string): v is ClaimTypeDTO => CLAIM_TYPES.has(v);

const parseTokenRefundData = (
  v: unknown,
  i: number,
): ClaimListRowDTO["refund_data"] => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `클레임 목록 행(${i})의 refund_data가 올바르지 않습니다: 객체가 아닙니다.`,
    );
  }
  if (
    typeof v.paid_token_amount !== "number" ||
    typeof v.bonus_token_amount !== "number" ||
    typeof v.refund_amount !== "number"
  ) {
    throw new Error(`클레임 목록 행(${i})의 refund_data 필수 필드 누락.`);
  }
  return {
    paid_token_amount: v.paid_token_amount,
    bonus_token_amount: v.bonus_token_amount,
    refund_amount: v.refund_amount,
  };
};

export const parseClaimListRows = (data: unknown): ClaimListRowDTO[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error("클레임 목록 응답이 올바르지 않습니다: 배열이 아닙니다.");
  }
  return data.map((row: unknown, i: number): ClaimListRowDTO => {
    if (!isRecord(row)) {
      throw new Error(
        `클레임 목록 행(${i})이 올바르지 않습니다: 객체가 아닙니다.`,
      );
    }
    if (
      typeof row.id !== "string" ||
      typeof row.claimNumber !== "string" ||
      typeof row.date !== "string" ||
      typeof row.status !== "string" ||
      typeof row.type !== "string" ||
      typeof row.reason !== "string" ||
      typeof row.claimQuantity !== "number" ||
      typeof row.orderId !== "string" ||
      typeof row.orderNumber !== "string" ||
      typeof row.orderDate !== "string"
    ) {
      throw new Error(
        `클레임 목록 행(${i})이 올바르지 않습니다: 필수 필드(id, claimNumber, date, status, type, reason, claimQuantity, orderId, orderNumber, orderDate) 누락.`,
      );
    }
    if (!isClaimStatus(row.status)) {
      throw new Error(
        `클레임 목록 행(${i})이 올바르지 않습니다: status 값(${row.status})이 허용된 상태가 아닙니다.`,
      );
    }
    if (!isClaimType(row.type)) {
      throw new Error(
        `클레임 목록 행(${i})이 올바르지 않습니다: type 값(${row.type})이 허용된 유형이 아닙니다.`,
      );
    }
    return {
      id: row.id,
      claimNumber: row.claimNumber,
      date: row.date,
      status: row.status,
      type: row.type,
      reason: row.reason,
      description: typeof row.description === "string" ? row.description : null,
      claimQuantity: row.claimQuantity,
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      orderDate: row.orderDate,
      item: parseClaimItemField(row.item, i),
      refund_data: parseTokenRefundData(row.refund_data, i),
    };
  });
};

export const parseCreateClaimResult = (data: unknown): CreateClaimResultDTO => {
  if (!isRecord(data)) {
    throw new Error("클레임 생성 응답이 올바르지 않습니다: 객체가 아닙니다.");
  }
  if (
    typeof data.claim_id !== "string" ||
    typeof data.claim_number !== "string"
  ) {
    throw new Error(
      "클레임 생성 응답이 올바르지 않습니다: claim_id 또는 claim_number 누락.",
    );
  }
  return { claim_id: data.claim_id, claim_number: data.claim_number };
};

// ── row → DTO 변환 ──────────────────────────────────

/**
 * ClaimListRowDTO → ClaimItem (View)
 */
export const toClaimItemView = (row: ClaimListRowDTO): ClaimItem => {
  const itemDTO = normalizeItemRow(row.item);
  const orderItem: OrderItem = toOrderItemView(itemDTO);

  return {
    id: row.id,
    claimNumber: row.claimNumber,
    date: row.date,
    status: row.status,
    type: row.type,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    item: orderItem,
    reason: row.reason,
    description: row.description,
    refundData: row.refund_data
      ? {
          paidTokenAmount: row.refund_data.paid_token_amount,
          bonusTokenAmount: row.refund_data.bonus_token_amount,
          refundAmount: row.refund_data.refund_amount,
        }
      : null,
  };
};

/**
 * CreateClaimRequest (View) → CreateClaimInputDTO (RPC params)
 */
export const toCreateClaimInputDTO = (
  request: CreateClaimRequest,
): CreateClaimInputDTO => ({
  p_type: request.type,
  p_order_id: request.orderId,
  p_item_id: request.itemId,
  p_reason: request.reason,
  p_description: request.description ?? null,
  p_quantity: request.quantity ?? null,
});
