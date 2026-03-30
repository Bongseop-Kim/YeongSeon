import { describe, expect, it } from "vitest";
import {
  mapCreateTokenPurchase,
  mapTokenPlans,
} from "@/entities/token-purchase";

describe("mapTokenPlans", () => {
  it("설정 행을 starter/popular/pro plan으로 매핑한다", () => {
    expect(
      mapTokenPlans([
        { key: "token_plan_starter_price", value: "9900" },
        { key: "token_plan_starter_amount", value: "10" },
        { key: "token_plan_popular_price", value: "19900" },
        { key: "token_plan_popular_amount", value: "25" },
        { key: "token_plan_pro_price", value: "39900" },
        { key: "token_plan_pro_amount", value: "60" },
      ]),
    ).toEqual([
      expect.objectContaining({
        planKey: "starter",
        price: 9900,
        tokenAmount: 10,
      }),
      expect.objectContaining({
        planKey: "popular",
        popular: true,
        price: 19900,
        tokenAmount: 25,
      }),
      expect.objectContaining({
        planKey: "pro",
        price: 39900,
        tokenAmount: 60,
      }),
    ]);
  });

  it("누락된 설정은 null로 둔다", () => {
    expect(mapTokenPlans([])).toEqual([
      expect.objectContaining({
        planKey: "starter",
        price: null,
        tokenAmount: null,
      }),
      expect.objectContaining({
        planKey: "popular",
        price: null,
        tokenAmount: null,
      }),
      expect.objectContaining({
        planKey: "pro",
        price: null,
        tokenAmount: null,
      }),
    ]);
  });
});

describe("mapCreateTokenPurchase", () => {
  it("snake_case DTO를 view 모델로 변환한다", () => {
    expect(
      mapCreateTokenPurchase({
        payment_group_id: "pg-1",
        price: 19900,
        token_amount: 25,
      }),
    ).toEqual({
      paymentGroupId: "pg-1",
      price: 19900,
      tokenAmount: 25,
    });
  });
});
