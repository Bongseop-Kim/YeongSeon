import { describe, expect, it } from "vitest";
import {
  toAdminCouponUser,
  toAdminIssuedCouponRow,
} from "@/features/coupons/api/coupons-mapper";
import { createIssuedCouponViewRow, createProfileRow } from "@/test/fixtures";

describe("toAdminCouponUser", () => {
  it("ProfileRow를 AdminCouponUser로 변환한다", () => {
    expect(toAdminCouponUser(createProfileRow())).toEqual(
      expect.objectContaining({
        id: "user-1",
        name: "홍길동",
        phone: "010-1111-2222",
        birth: "1990-01-01",
        createdAt: "2026-03-15T09:00:00Z",
      }),
    );
  });
});

describe("toAdminIssuedCouponRow", () => {
  it("id가 있으면 그대로 사용한다", () => {
    expect(toAdminIssuedCouponRow(createIssuedCouponViewRow())).toEqual(
      expect.objectContaining({
        id: "issued-1",
      }),
    );
  });

  it("id가 없고 userId+couponId가 있으면 합성 id를 생성한다", () => {
    expect(
      toAdminIssuedCouponRow(
        createIssuedCouponViewRow({
          id: null,
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        id: "user-1:coupon-1",
      }),
    );
  });

  it("id, userId, couponId 모두 없으면 id가 undefined이다", () => {
    expect(
      toAdminIssuedCouponRow(
        createIssuedCouponViewRow({
          id: undefined,
          userId: null,
          couponId: null,
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        id: undefined,
      }),
    );
  });

  it("nullish 필드를 null로 정규화한다", () => {
    expect(
      toAdminIssuedCouponRow(
        createIssuedCouponViewRow({
          id: null,
          userId: null,
          couponId: null,
          userName: undefined,
          userEmail: undefined,
          status: undefined,
          issuedAt: undefined,
        }),
      ),
    ).toEqual({
      id: undefined,
      userId: null,
      couponId: null,
      userName: null,
      userEmail: null,
      status: null,
      issuedAt: null,
    });
  });
});
