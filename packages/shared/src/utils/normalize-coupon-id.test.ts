import { describe, expect, it } from "vitest";
import { normalizeCouponId } from "./normalize-coupon-id";

describe("normalizeCouponId", () => {
  it("undefined를 반환한다 — 입력이 undefined일 때", () => {
    expect(normalizeCouponId(undefined)).toBeUndefined();
  });

  it("undefined를 반환한다 — 빈 문자열일 때", () => {
    expect(normalizeCouponId("")).toBeUndefined();
  });

  it("undefined를 반환한다 — 공백뿐인 문자열일 때", () => {
    expect(normalizeCouponId("   ")).toBeUndefined();
  });

  it("trim된 값을 반환한다 — 앞뒤 공백이 있을 때", () => {
    expect(normalizeCouponId("  coupon-uuid  ")).toBe("coupon-uuid");
  });

  it("그대로 반환한다 — 정상 문자열일 때", () => {
    expect(normalizeCouponId("coupon-uuid")).toBe("coupon-uuid");
  });
});
