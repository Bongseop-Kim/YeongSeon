import { describe, expect, it } from "vitest";
import {
  mapRecordToCoupon,
  mapRecordToUserCoupon,
  parseUserCouponRecords,
} from "@/features/coupon/api/coupons-mapper";

const createUserCouponRecordRaw = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  id: "uc-1",
  user_id: "user-1",
  coupon_id: "coupon-1",
  status: "active",
  issued_at: "2026-03-01T09:00:00Z",
  expires_at: "2026-03-31T23:59:59Z",
  used_at: null,
  coupon: {
    id: "coupon-1",
    name: "10% 할인",
    discount_type: "percentage",
    discount_value: 10,
    max_discount_amount: 3000,
    description: "봄 세일",
    expiry_date: "2026-03-31",
    additional_info: "일부 품목 제외",
  },
  ...overrides,
});

describe("parseUserCouponRecords", () => {
  it("유효한 쿠폰 레코드를 파싱한다", () => {
    expect(parseUserCouponRecords([createUserCouponRecordRaw()])).toEqual([
      {
        id: "uc-1",
        user_id: "user-1",
        coupon_id: "coupon-1",
        status: "active",
        issued_at: "2026-03-01T09:00:00Z",
        expires_at: "2026-03-31T23:59:59Z",
        used_at: null,
        coupon: {
          id: "coupon-1",
          name: "10% 할인",
          discount_type: "percentage",
          discount_value: 10,
          max_discount_amount: 3000,
          description: "봄 세일",
          expiry_date: "2026-03-31",
          additional_info: "일부 품목 제외",
        },
      },
    ]);
  });

  it("coupon이 null이면 null로 유지한다", () => {
    expect(
      parseUserCouponRecords([createUserCouponRecordRaw({ coupon: null })])[0],
    ).toEqual(
      expect.objectContaining({
        coupon: null,
      }),
    );
  });

  describe("에러 케이스", () => {
    it("배열이 아니면 에러를 던진다", () => {
      expect(() => parseUserCouponRecords({})).toThrow(
        "쿠폰 조회 응답이 올바르지 않습니다: 배열이 아닙니다.",
      );
    });

    it("status가 허용되지 않으면 에러를 던진다", () => {
      expect(() =>
        parseUserCouponRecords([
          createUserCouponRecordRaw({ status: "pending" }),
        ]),
      ).toThrow("status 값(pending)이 허용된 상태가 아닙니다.");
    });

    it("coupon.discount_type이 허용되지 않으면 에러를 던진다", () => {
      expect(() =>
        parseUserCouponRecords([
          createUserCouponRecordRaw({
            coupon: {
              ...(createUserCouponRecordRaw().coupon as Record<
                string,
                unknown
              >),
              discount_type: "cash",
            },
          }),
        ]),
      ).toThrow(
        'discount_type 값(cash)이 허용된 유형("percentage" | "fixed")이 아닙니다.',
      );
    });

    it("coupon 필수 필드가 없으면 에러를 던진다", () => {
      expect(() =>
        parseUserCouponRecords([
          createUserCouponRecordRaw({
            coupon: {
              id: "coupon-1",
              name: "이름만 있음",
            },
          }),
        ]),
      ).toThrow(
        "coupon이 올바르지 않습니다: 필수 필드(id, name, discount_type, discount_value, expiry_date) 누락.",
      );
    });
  });
});

describe("coupon record -> view", () => {
  it("coupon record를 coupon view로 변환한다", () => {
    const record = parseUserCouponRecords([createUserCouponRecordRaw()])[0]
      ?.coupon;

    expect(record).not.toBeNull();
    if (record == null) {
      throw new Error("coupon fixture should not be null");
    }

    expect(mapRecordToCoupon(record)).toEqual(
      expect.objectContaining({
        id: "coupon-1",
        discountType: "percentage",
      }),
    );
  });

  it("user coupon record를 view로 변환하고 coupon 누락 시 에러를 던진다", () => {
    const record = parseUserCouponRecords([createUserCouponRecordRaw()])[0];

    expect(mapRecordToUserCoupon(record)).toEqual(
      expect.objectContaining({
        id: "uc-1",
        coupon: expect.objectContaining({ name: "10% 할인" }),
      }),
    );
    expect(() => mapRecordToUserCoupon({ ...record, coupon: null })).toThrow(
      "쿠폰 정책 정보를 찾을 수 없습니다.",
    );
  });
});
