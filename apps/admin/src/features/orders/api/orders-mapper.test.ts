import type { AdminSampleOrderItemRowDTO } from "@yeongseon/shared";
import { describe, expect, it, vi } from "vitest";
import {
  parseCustomReformData,
  parseRepairReformData,
  toAdminOrderDetail,
  toAdminOrderItem,
  toAdminOrderListItem,
  toAdminStatusLogEntry,
} from "@/features/orders/api/orders-mapper";
import {
  createAdminCustomOrderItemRowDTO,
  createAdminOrderDetailRowDTO,
  createAdminOrderItemRowDTO,
  createAdminOrderListRowDTO,
  createAdminReformOrderItemRowDTO,
  createOrderStatusLogDTO,
  createAdminTokenOrderItemRowDTO,
} from "@/test/fixtures";

function createSampleRowDTO(): AdminSampleOrderItemRowDTO {
  return {
    id: "row-sample-1",
    orderId: "order-1",
    itemId: "item-sample-1",
    itemType: "sample",
    productId: null,
    selectedOptionId: null,
    reformData: null,
    quantity: 1,
    unitPrice: 5000,
    discountAmount: 0,
    lineDiscountAmount: 0,
    appliedUserCouponId: null,
    created_at: "2026-03-15T09:00:00Z",
    productName: null,
    productCode: null,
    productImage: null,
  };
}

describe("parseCustomReformData", () => {
  it("유효한 custom reformData를 파싱한다", () => {
    expect(
      parseCustomReformData({
        quantity: 2,
        options: {
          tie_type: "3fold",
          interlining: "wool",
          design_type: "classic",
          fabric_type: "silk",
          fabric_provided: true,
        },
        pricing: {
          sewing_cost: 12000,
          fabric_cost: 8000,
          total_cost: 20000,
        },
        sample: true,
        sample_type: "paper",
        reference_images: [
          { url: "https://example.com/ref.jpg", file_id: null },
        ],
        additional_notes: "메모",
      }),
    ).toEqual(
      expect.objectContaining({
        _tag: "custom",
        quantity: 2,
        options: expect.objectContaining({
          tieType: "3fold",
          interlining: "wool",
          designType: "classic",
          fabricType: "silk",
          fabricProvided: true,
        }),
        pricing: {
          sewingCost: 12000,
          fabricCost: 8000,
          totalCost: 20000,
        },
        sample: true,
        sampleType: "paper",
        referenceImageUrls: ["https://example.com/ref.jpg"],
        additionalNotes: "메모",
      }),
    );
  });

  it("quantity가 없으면 0으로 대체하고 경고를 남긴다", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      parseCustomReformData({
        pricing: {
          sewing_cost: 12000,
          fabric_cost: 8000,
          total_cost: 20000,
        },
      }),
    ).toEqual(expect.objectContaining({ quantity: 0 }));
    expect(warnSpy).toHaveBeenCalled();
  });

  it("quantity가 유효한 양수가 아니면 ValidationError를 던진다", () => {
    expect(() =>
      parseCustomReformData({
        quantity: 0,
        pricing: {
          sewing_cost: 12000,
          fabric_cost: 8000,
          total_cost: 20000,
        },
      }),
    ).toThrow(
      "주문 제작 reformData 검증 실패: quantity가 유한한 양수가 아닙니다",
    );
  });

  it("pricing 필드가 누락되면 ValidationError를 던진다", () => {
    expect(() =>
      parseCustomReformData({
        quantity: 1,
        pricing: {
          sewing_cost: 12000,
          total_cost: 20000,
        },
      }),
    ).toThrow("유효하지 않은 pricing 필드 (pricing.fabric_cost)");
  });
});

describe("toAdminOrderItem", () => {
  it("주문 목록 아이템을 그대로 매핑한다", () => {
    expect(toAdminOrderListItem(createAdminOrderListRowDTO())).toEqual({
      id: "order-1",
      orderNumber: "ORD-001",
      date: "2026-03-15",
      orderType: "custom",
      status: "진행중",
      totalPrice: 23000,
      customerName: "홍길동",
      customerEmail: "hong@example.com",
      fabricType: "silk",
      designType: "classic",
      itemQuantity: 1,
      isSample: false,
      sampleType: null,
      reformSummary: null,
    });
  });

  it("주문 상세에서 배송지와 운송장 정보를 매핑한다", () => {
    expect(toAdminOrderDetail(createAdminOrderDetailRowDTO())).toEqual(
      expect.objectContaining({
        shippingAddress: {
          recipientName: "홍길동",
          recipientPhone: "010-3333-4444",
          postalCode: "06236",
          address: "서울특별시 강남구 테헤란로 1",
          addressDetail: "101호",
          deliveryMemo: "문 앞에 놓아주세요",
          deliveryRequest: "부재 시 연락 바랍니다",
        },
        trackingInfo: {
          courierCompany: "CJ대한통운",
          trackingNumber: "1234567890",
          shippedAt: "2026-03-15T10:00:00Z",
          deliveredAt: null,
        },
      }),
    );
  });

  it("수령인 이름이나 운송장 정보가 없으면 null 분기를 탄다", () => {
    expect(
      toAdminOrderDetail(
        createAdminOrderDetailRowDTO({
          recipientName: null,
          courierCompany: null,
          trackingNumber: "1234567890",
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        shippingAddress: null,
        trackingInfo: null,
      }),
    );
  });

  it("product 아이템을 매핑한다", () => {
    expect(toAdminOrderItem(createAdminOrderItemRowDTO(), "sale")).toEqual(
      expect.objectContaining({
        type: "product",
        productId: 1,
        productName: "테스트 넥타이",
      }),
    );
  });

  it("sale 주문의 reform 아이템은 reformData를 비운다", () => {
    expect(
      toAdminOrderItem(createAdminReformOrderItemRowDTO(), "sale"),
    ).toEqual(
      expect.objectContaining({
        type: "reform",
        reformData: null,
      }),
    );
  });

  it("custom 아이템을 customData와 함께 매핑한다", () => {
    expect(
      toAdminOrderItem(createAdminCustomOrderItemRowDTO(), "custom"),
    ).toEqual(
      expect.objectContaining({
        type: "custom",
        customData: expect.objectContaining({
          _tag: "custom",
          pricing: expect.objectContaining({ totalCost: 20000 }),
        }),
      }),
    );
  });

  it("reform 아이템을 repair order에서만 reformData와 함께 매핑한다", () => {
    expect(
      toAdminOrderItem(createAdminReformOrderItemRowDTO(), "repair"),
    ).toEqual(
      expect.objectContaining({
        type: "reform",
        reformData: expect.objectContaining({
          _tag: "repair",
          ties: [expect.objectContaining({ measurementType: "length" })],
        }),
      }),
    );
  });

  it("token 아이템을 매핑한다", () => {
    expect(toAdminOrderItem(createAdminTokenOrderItemRowDTO(), "sale")).toEqual(
      expect.objectContaining({
        type: "token",
        planKey: "starter",
        tokenAmount: 30,
      }),
    );
  });

  it("token 아이템에서 reformData가 null이면 planKey와 tokenAmount가 null이다", () => {
    expect(
      toAdminOrderItem(
        createAdminTokenOrderItemRowDTO({ reformData: null }),
        "sale",
      ),
    ).toEqual(
      expect.objectContaining({
        type: "token",
        planKey: null,
        tokenAmount: null,
      }),
    );
  });

  it("sample 아이템을 reformData 없이 매핑한다", () => {
    expect(toAdminOrderItem(createSampleRowDTO(), "sale")).toEqual(
      expect.objectContaining({
        type: "sample",
        sampleData: null,
      }),
    );
  });

  it("sample 아이템을 유효한 reformData와 함께 매핑한다", () => {
    const dto: AdminSampleOrderItemRowDTO = {
      ...createSampleRowDTO(),
      reformData: {
        sample_type: "fabric",
        pricing: { total_cost: 8000 },
        options: {
          fabric_type: "silk",
          design_type: "classic",
          tie_type: "3fold",
          interlining: "wool",
        },
        reference_images: [],
        additional_notes: null,
      },
    };
    const result = toAdminOrderItem(dto, "sale");
    expect(result).toEqual(
      expect.objectContaining({
        type: "sample",
        sampleData: expect.objectContaining({
          sampleType: "fabric",
          pricing: { totalCost: 8000 },
        }),
      }),
    );
  });

  it("sample 아이템에서 reformData가 유효하지 않으면 sampleData가 null이다", () => {
    const dto: AdminSampleOrderItemRowDTO = {
      ...createSampleRowDTO(),
      reformData: { sample_type: "invalid_type" },
    };
    const result = toAdminOrderItem(dto, "sale");
    expect(result).toEqual(
      expect.objectContaining({
        type: "sample",
        sampleData: null,
      }),
    );
  });
});

describe("parseRepairReformData", () => {
  it("tie 정보가 없으면 빈 배열을 반환한다", () => {
    expect(parseRepairReformData({})).toEqual({
      _tag: "repair",
      ties: [],
    });
  });
});

describe("toAdminStatusLogEntry", () => {
  it("주문 상태 로그 필드를 그대로 매핑한다", () => {
    expect(toAdminStatusLogEntry(createOrderStatusLogDTO())).toEqual({
      id: "status-log-1",
      orderId: "order-1",
      changedBy: "admin-1",
      previousStatus: "대기중",
      newStatus: "진행중",
      memo: "처리 시작",
      isRollback: false,
      createdAt: "2026-03-15T11:00:00Z",
    });
  });
});
