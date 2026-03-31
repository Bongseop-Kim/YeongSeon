import { describe, expect, it } from "vitest";
import {
  fromOrderItemRowDTO,
  toOrderItemInputDTO,
  toOrderView,
  toOrderViewFromDetail,
  parseCreateOrderResult,
  parseOrderDetailRow,
  parseOrderItemRows,
  parseOrderListRows,
} from "@/entities/order";
import {
  createAppliedCoupon,
  createProduct,
  createProductOption,
  createOrderItemRowRaw,
} from "@/test/fixtures";

const createOrderListRowRaw = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  id: "order-1",
  orderNumber: "ORD-001",
  date: "2026-03-15",
  status: "진행중",
  totalPrice: 23000,
  orderType: "sale",
  created_at: "2026-03-15T09:00:00Z",
  ...overrides,
});

const createOrderDetailRowRaw = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  id: "order-1",
  orderNumber: "ORD-001",
  date: "2026-03-15",
  status: "진행중",
  totalPrice: 23000,
  orderType: "sale",
  courierCompany: "CJ대한통운",
  trackingNumber: "1234567890",
  shippedAt: "2026-03-15T10:00:00Z",
  deliveredAt: null,
  companyCourierCompany: null,
  companyTrackingNumber: null,
  companyShippedAt: null,
  confirmedAt: null,
  created_at: "2026-03-15T09:00:00Z",
  recipientName: "홍길동",
  recipientPhone: "010-1111-2222",
  shippingAddress: "서울시 강남구",
  shippingAddressDetail: "101호",
  shippingPostalCode: "12345",
  deliveryMemo: "문 앞",
  deliveryRequest: "빠른 배송",
  ...overrides,
});

const createCreateOrderResultRaw = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  payment_group_id: "pg-1",
  total_amount: 23000,
  orders: [
    {
      order_id: "order-1",
      order_number: "ORD-001",
      order_type: "sale",
    },
  ],
  ...overrides,
});

describe("toOrderItemInputDTO", () => {
  it("product 아이템을 DTO로 변환한다", () => {
    expect(
      toOrderItemInputDTO({
        id: "item-1",
        type: "product",
        product: createProduct(),
        selectedOption: createProductOption({ id: "opt-2" }),
        quantity: 2,
        appliedCoupon: createAppliedCoupon(),
      }),
    ).toEqual({
      item_id: "item-1",
      item_type: "product",
      product_id: 1,
      selected_option_id: "opt-2",
      quantity: 2,
      applied_user_coupon_id: "uc-1",
      reform_data: null,
    });
  });

  it("reform 아이템에 tie가 없으면 reform_data를 null로 둔다", () => {
    expect(
      toOrderItemInputDTO({
        id: "item-2",
        type: "reform",
        quantity: 1,
        reformData: { tie: undefined as never, cost: 15000 },
      }),
    ).toEqual({
      item_id: "item-2",
      item_type: "reform",
      product_id: null,
      selected_option_id: null,
      quantity: 1,
      applied_user_coupon_id: null,
      reform_data: null,
    });
  });

  it("reform 아이템의 tie.id가 문자열이 아니면 reform_data를 null로 둔다", () => {
    expect(
      toOrderItemInputDTO({
        id: "item-3",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: { id: 123 as never, measurementType: "length", tieLength: 145 },
          cost: 15000,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        item_type: "reform",
        reform_data: null,
      }),
    );
  });
});

describe("toOrderView", () => {
  it("주문 DTO를 화면 모델로 변환한다", () => {
    expect(
      toOrderView({
        id: "order-1",
        orderNumber: "ORD-001",
        date: "2026-03-15",
        status: "진행중",
        orderType: "sale",
        totalPrice: 10000,
        customerActions: [],
        items: [
          {
            id: "item-1",
            type: "product",
            product: createProduct(),
            selectedOption: createProductOption(),
            quantity: 1,
          },
        ],
      }),
    ).toEqual(
      expect.objectContaining({
        shippingInfo: null,
        trackingInfo: null,
        confirmedAt: null,
        customerActions: [],
        items: [
          expect.objectContaining({
            type: "product",
            product: expect.objectContaining({ id: 1 }),
          }),
        ],
      }),
    );
  });
});

describe("toOrderViewFromDetail", () => {
  it("배송/추적 정보를 포함한 상세 DTO를 화면 모델로 변환한다", () => {
    expect(
      toOrderViewFromDetail(parseOrderDetailRow(createOrderDetailRowRaw()), [
        fromOrderItemRowDTO(parseOrderItemRows([createOrderItemRowRaw()])[0]),
      ]),
    ).toEqual(
      expect.objectContaining({
        shippingInfo: {
          recipientName: "홍길동",
          recipientPhone: "010-1111-2222",
          address: "서울시 강남구",
          addressDetail: "101호",
          postalCode: "12345",
          deliveryMemo: "문 앞",
          deliveryRequest: "빠른 배송",
        },
        trackingInfo: {
          courierCompany: "CJ대한통운",
          trackingNumber: "1234567890",
          shippedAt: "2026-03-15T10:00:00Z",
          deliveredAt: null,
          companyCourierCompany: null,
          companyTrackingNumber: null,
          companyShippedAt: null,
        },
        confirmedAt: null,
      }),
    );
  });

  it("수선 주문의 업체 발송 정보만 있어도 trackingInfo를 유지한다", () => {
    expect(
      toOrderViewFromDetail(
        parseOrderDetailRow(
          createOrderDetailRowRaw({
            orderType: "repair",
            courierCompany: null,
            trackingNumber: null,
            shippedAt: null,
            companyCourierCompany: "한진택배",
            companyTrackingNumber: "COMPANY-123",
            companyShippedAt: "2026-03-16T10:00:00Z",
          }),
        ),
        [],
      ),
    ).toEqual(
      expect.objectContaining({
        trackingInfo: {
          courierCompany: null,
          trackingNumber: null,
          shippedAt: null,
          deliveredAt: null,
          companyCourierCompany: "한진택배",
          companyTrackingNumber: "COMPANY-123",
          companyShippedAt: "2026-03-16T10:00:00Z",
        },
      }),
    );
  });

  it("고객/업체 운송장 정보가 모두 없으면 null로 변환한다", () => {
    expect(
      toOrderViewFromDetail(
        parseOrderDetailRow(
          createOrderDetailRowRaw({
            recipientName: null,
            courierCompany: null,
            trackingNumber: null,
            companyCourierCompany: null,
            companyTrackingNumber: null,
          }),
        ),
        [],
      ),
    ).toEqual(
      expect.objectContaining({
        shippingInfo: null,
        trackingInfo: null,
      }),
    );
  });
});

describe("parseOrderListRows", () => {
  it("null 입력은 빈 배열을 반환한다", () => {
    expect(parseOrderListRows(null)).toEqual([]);
  });

  it("유효한 주문 목록 행을 파싱한다", () => {
    expect(parseOrderListRows([createOrderListRowRaw()])).toEqual([
      {
        id: "order-1",
        orderNumber: "ORD-001",
        date: "2026-03-15",
        status: "진행중",
        totalPrice: 23000,
        orderType: "sale",
        created_at: "2026-03-15T09:00:00Z",
        customerActions: [],
      },
    ]);
  });

  describe("에러 케이스", () => {
    it("배열이 아니면 에러를 던진다", () => {
      expect(() => parseOrderListRows({})).toThrow(
        "주문 목록 응답이 올바르지 않습니다: 배열이 아닙니다.",
      );
    });

    it("허용되지 않은 orderType이면 에러를 던진다", () => {
      expect(() =>
        parseOrderListRows([createOrderListRowRaw({ orderType: "invalid" })]),
      ).toThrow("orderType 값(invalid)이 허용된 유형이 아닙니다.");
    });

    it("실패 status를 허용한다", () => {
      expect(
        parseOrderListRows([createOrderListRowRaw({ status: "실패" })]),
      ).toEqual([
        expect.objectContaining({
          id: "order-1",
          status: "실패",
        }),
      ]);
    });
  });
});

describe("parseOrderItemRows", () => {
  it("null 입력은 빈 배열을 반환한다", () => {
    expect(parseOrderItemRows(null)).toEqual([]);
  });

  it("product 타입 행을 파싱한다", () => {
    expect(parseOrderItemRows([createOrderItemRowRaw()])[0]).toEqual(
      expect.objectContaining({
        id: "item-1",
        type: "product",
        product: expect.objectContaining({ id: 1, category: "3fold" }),
        selectedOption: expect.objectContaining({ id: "opt-1" }),
        quantity: 1,
        customData: null,
      }),
    );
  });

  it("reform 타입 행을 파싱한다", () => {
    expect(
      parseOrderItemRows([
        createOrderItemRowRaw({
          type: "reform",
          product: null,
          selectedOption: null,
          reformData: {
            tie: {
              id: "tie-1",
              measurementType: "length",
              tieLength: 145,
            },
            cost: 15000,
          },
        }),
      ])[0],
    ).toEqual(
      expect.objectContaining({
        type: "reform",
        reformData: expect.objectContaining({ cost: 15000 }),
      }),
    );
  });

  it("custom 타입 행을 파싱한다", () => {
    expect(
      parseOrderItemRows([
        createOrderItemRowRaw({
          type: "custom",
          product: null,
          selectedOption: null,
          reformData: {
            options: {
              tie_type: "3fold",
            },
            pricing: {
              sewing_cost: 12000,
              fabric_cost: 8000,
              total_cost: 20000,
            },
            sample: false,
            sample_type: null,
            reference_images: [{ url: "https://example.com/reference-1.jpg" }],
            additional_notes: "메모",
          },
        }),
      ])[0],
    ).toEqual(
      expect.objectContaining({
        type: "custom",
        customData: expect.objectContaining({
          options: expect.objectContaining({
            tieType: "3fold",
          }),
          pricing: expect.objectContaining({
            sewingCost: 12000,
            fabricCost: 8000,
            totalCost: 20000,
          }),
          sample: false,
          sampleType: null,
          referenceImageUrls: ["https://example.com/reference-1.jpg"],
          additionalNotes: "메모",
        }),
      }),
    );
  });

  it("token 타입 행을 파싱한다", () => {
    expect(
      parseOrderItemRows([
        createOrderItemRowRaw({
          type: "token",
          product: null,
          selectedOption: null,
          appliedCoupon: {
            ...createAppliedCoupon(),
            expiresAt: "2027-01-01",
            usedAt: "2026-03-16",
          },
        }),
      ])[0],
    ).toEqual(
      expect.objectContaining({
        type: "token",
        product: null,
        reformData: null,
        customData: null,
        appliedCoupon: expect.objectContaining({
          status: "active",
          expiresAt: "2027-01-01",
          usedAt: "2026-03-16",
        }),
      }),
    );
  });

  describe("에러 케이스", () => {
    it("배열이 아니면 에러를 던진다", () => {
      expect(() => parseOrderItemRows({})).toThrow(
        "주문 상품 응답이 올바르지 않습니다: 배열이 아닙니다.",
      );
    });

    it("product 타입인데 product가 없으면 에러를 던진다", () => {
      expect(() =>
        parseOrderItemRows([
          createOrderItemRowRaw({
            type: "product",
            product: null,
          }),
        ]),
      ).toThrow('type이 "product"인 경우 product 필드가 필요합니다.');
    });

    it("reform 타입에서 cost가 없으면 에러를 던진다", () => {
      expect(() =>
        parseOrderItemRows([
          createOrderItemRowRaw({
            type: "reform",
            product: null,
            selectedOption: null,
            reformData: {
              tie: { id: "tie-1" },
            },
          }),
        ]),
      ).toThrow("parseReformDataField: cost 필드가 없거나 숫자가 아닙니다.");
    });

    it("selectedOption이 객체가 아니면 에러를 던진다", () => {
      expect(() =>
        parseOrderItemRows([
          createOrderItemRowRaw({
            selectedOption: "invalid",
          }),
        ]),
      ).toThrow("selectedOption이 올바르지 않습니다: 객체가 아닙니다.");
    });

    it("custom 타입에서 custom 데이터가 없으면 에러를 던진다", () => {
      expect(() =>
        parseOrderItemRows([
          createOrderItemRowRaw({
            type: "custom",
            product: null,
            selectedOption: null,
            reformData: null,
          }),
        ]),
      ).toThrow('type이 "custom"인 경우 reformData(custom) 필드가 필요합니다.');
    });

    it("custom 데이터가 객체가 아니면 에러를 던진다", () => {
      expect(() =>
        parseOrderItemRows([
          createOrderItemRowRaw({
            type: "custom",
            product: null,
            selectedOption: null,
            reformData: "invalid",
          }),
        ]),
      ).toThrow("reformData(custom)가 올바르지 않습니다: 객체가 아닙니다.");
    });

    it("product category가 잘못되면 에러를 던진다", () => {
      expect(() =>
        parseOrderItemRows([
          createOrderItemRowRaw({
            product: {
              ...(createOrderItemRowRaw().product as Record<string, unknown>),
              category: "invalid",
            },
          }),
        ]),
      ).toThrow("category 값(invalid)이 허용된 값이 아닙니다.");
    });

    it("appliedCoupon status가 잘못되면 에러를 던진다", () => {
      expect(() =>
        parseOrderItemRows([
          createOrderItemRowRaw({
            appliedCoupon: {
              ...createAppliedCoupon(),
              status: "invalid",
            },
          }),
        ]),
      ).toThrow("status 값(invalid)이 허용된 상태가 아닙니다.");
    });

    it("appliedCoupon discountType이 잘못되면 에러를 던진다", () => {
      expect(() =>
        parseOrderItemRows([
          createOrderItemRowRaw({
            appliedCoupon: {
              ...createAppliedCoupon(),
              coupon: {
                ...createAppliedCoupon().coupon,
                discountType: "invalid",
              },
            },
          }),
        ]),
      ).toThrow("discountType 값(invalid)이 허용된 값이 아닙니다.");
    });
  });
});

describe("parseOrderDetailRow", () => {
  it("유효한 주문 상세 행을 파싱한다", () => {
    expect(parseOrderDetailRow(createOrderDetailRowRaw())).toEqual({
      id: "order-1",
      orderNumber: "ORD-001",
      date: "2026-03-15",
      status: "진행중",
      totalPrice: 23000,
      orderType: "sale",
      courierCompany: "CJ대한통운",
      trackingNumber: "1234567890",
      shippedAt: "2026-03-15T10:00:00Z",
      deliveredAt: null,
      companyCourierCompany: null,
      companyTrackingNumber: null,
      companyShippedAt: null,
      confirmedAt: null,
      created_at: "2026-03-15T09:00:00Z",
      recipientName: "홍길동",
      recipientPhone: "010-1111-2222",
      shippingAddress: "서울시 강남구",
      shippingAddressDetail: "101호",
      shippingPostalCode: "12345",
      deliveryMemo: "문 앞",
      deliveryRequest: "빠른 배송",
      customerActions: [],
    });
  });

  it("문자열이 아닌 선택 필드는 null로 fallback한다", () => {
    expect(
      parseOrderDetailRow(
        createOrderDetailRowRaw({
          courierCompany: 123,
          trackingNumber: undefined,
          companyCourierCompany: 123,
          companyTrackingNumber: undefined,
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        courierCompany: null,
        trackingNumber: null,
        companyCourierCompany: null,
        companyTrackingNumber: null,
      }),
    );
  });

  it("실패 status를 허용한다", () => {
    expect(
      parseOrderDetailRow(createOrderDetailRowRaw({ status: "실패" })),
    ).toEqual(
      expect.objectContaining({
        id: "order-1",
        status: "실패",
      }),
    );
  });

  it("허용되지 않은 orderType이면 에러를 던진다", () => {
    expect(() =>
      parseOrderDetailRow(createOrderDetailRowRaw({ orderType: "invalid" })),
    ).toThrow("orderType 값(invalid)이 허용된 유형이 아닙니다.");
  });
});

describe("parseCreateOrderResult", () => {
  it("주문 생성 응답을 파싱한다", () => {
    expect(parseCreateOrderResult(createCreateOrderResultRaw())).toEqual({
      payment_group_id: "pg-1",
      total_amount: 23000,
      orders: [
        {
          order_id: "order-1",
          order_number: "ORD-001",
          order_type: "sale",
        },
      ],
    });
  });

  it("orders 항목이 객체가 아니면 에러를 던진다", () => {
    expect(() =>
      parseCreateOrderResult(
        createCreateOrderResultRaw({
          orders: [null],
        }),
      ),
    ).toThrow(
      "주문 생성 응답의 orders[0]가 올바르지 않습니다: 객체가 아닙니다.",
    );
  });

  it("루트가 객체가 아니면 에러를 던진다", () => {
    expect(() => parseCreateOrderResult(null)).toThrow(
      "주문 생성 응답이 올바르지 않습니다: 객체가 아닙니다.",
    );
  });

  it("orders 항목에 order_type이 없으면 에러를 던진다", () => {
    expect(() =>
      parseCreateOrderResult(
        createCreateOrderResultRaw({
          orders: [
            {
              order_id: "order-1",
              order_number: "ORD-001",
            },
          ],
        }),
      ),
    ).toThrow("orders[0].order_type이 올바르지 않습니다: string이 아닙니다.");
  });
});
