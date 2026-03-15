import { describe, expect, it } from "vitest";
import {
  toAdminCustomerCouponRow,
  toAdminCustomerDetail,
  toAdminCustomerListItem,
  toAdminCustomerOrderRow,
  toAdminCustomerTokenRow,
} from "@/features/customers/api/customers-mapper";
import {
  createAdminOrderListRowDTO,
  createDesignTokenRow,
  createProfileRow,
  createUserCouponRow,
} from "@/test/fixtures";

describe("toAdminCustomerListItem", () => {
  it("null 필드를 기본값으로 정규화한다", () => {
    expect(
      toAdminCustomerListItem(
        createProfileRow({
          name: null,
          role: null,
          is_active: null,
          created_at: null,
        }),
      ),
    ).toEqual({
      id: "user-1",
      name: "",
      phone: "010-1111-2222",
      role: "",
      isActive: false,
      createdAt: "",
    });
  });
});

describe("기타 customer 매퍼", () => {
  it("상세 정보는 birth를 유지한다", () => {
    expect(toAdminCustomerDetail(createProfileRow())).toEqual(
      expect.objectContaining({
        birth: "1990-01-01",
      }),
    );
  });

  it("쿠폰과 토큰 row의 null 필드를 기본값으로 정규화한다", () => {
    expect(
      toAdminCustomerCouponRow(
        createUserCouponRow({
          coupon_id: null,
          status: null,
          issued_at: null,
        }),
      ),
    ).toEqual({
      id: "uc-1",
      couponId: "",
      status: "",
      issuedAt: "",
      expiresAt: "2026-03-31T23:59:59Z",
    });

    expect(
      toAdminCustomerTokenRow(
        createDesignTokenRow({
          amount: null,
          type: null,
          created_at: null,
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        amount: 0,
        type: "",
        createdAt: "",
      }),
    );
  });

  it("주문 row를 고객 주문 UI 모델로 매핑한다", () => {
    expect(toAdminCustomerOrderRow(createAdminOrderListRowDTO())).toEqual({
      id: "order-1",
      orderNumber: "ORD-001",
      date: "2026-03-15",
      status: "진행중",
      totalPrice: 23000,
    });
  });
});
