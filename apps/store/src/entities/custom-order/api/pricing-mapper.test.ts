import { describe, expect, it } from "vitest";
import { toPricingConfig } from "@/entities/custom-order";
import type { PricingConstantRow } from "@/entities/custom-order";

const createConstant = (key: string, amount: number): PricingConstantRow => ({
  key,
  amount,
});

const pricingConstants: PricingConstantRow[] = [
  createConstant("START_COST", 10000),
  createConstant("SEWING_PER_COST", 2000),
  createConstant("AUTO_TIE_COST", 1000),
  createConstant("TRIANGLE_STITCH_COST", 300),
  createConstant("SIDE_STITCH_COST", 400),
  createConstant("BAR_TACK_COST", 500),
  createConstant("DIMPLE_COST", 600),
  createConstant("SPODERATO_COST", 700),
  createConstant("FOLD7_COST", 800),
  createConstant("WOOL_INTERLINING_COST", 900),
  createConstant("BRAND_LABEL_COST", 100),
  createConstant("CARE_LABEL_COST", 110),
  createConstant("YARN_DYED_DESIGN_COST", 120),
  createConstant("FABRIC_QTY_ADULT", 130),
  createConstant("FABRIC_QTY_ADULT_FOLD7", 140),
  createConstant("FABRIC_QTY_CHILD", 150),
  createConstant("SAMPLE_SEWING_COST", 160),
  createConstant("SAMPLE_FABRIC_PRINTING_COST", 170),
  createConstant("SAMPLE_FABRIC_YARN_DYED_COST", 175),
  createConstant("SAMPLE_FABRIC_AND_SEWING_PRINTING_COST", 180),
  createConstant("SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST", 185),
];

const fabricPrices: PricingConstantRow[] = [
  createConstant("FABRIC_YARN_DYED_SILK", 1000),
  createConstant("FABRIC_YARN_DYED_POLY", 1100),
  createConstant("FABRIC_PRINTING_SILK", 1200),
  createConstant("FABRIC_PRINTING_POLY", 1300),
];

describe("toPricingConfig", () => {
  it("21개 상수와 4개 원단 가격 조합을 매핑한다", () => {
    expect(toPricingConfig(pricingConstants, fabricPrices)).toEqual(
      expect.objectContaining({
        START_COST: 10000,
        SEWING_PER_COST: 2000,
        FOLD7_COST: 800,
        FABRIC_COST: {
          YARN_DYED: {
            SILK: 1000,
            POLY: 1100,
          },
          PRINTING: {
            SILK: 1200,
            POLY: 1300,
          },
        },
      }),
    );
  });

  it("필수 상수가 누락되면 에러를 던진다", () => {
    expect(() =>
      toPricingConfig(
        pricingConstants.filter((row) => row.key !== "START_COST"),
        fabricPrices,
      ),
    ).toThrow("Missing pricing constant: START_COST");
  });

  it("원단 가격 조합이 누락되면 에러를 던진다", () => {
    expect(() =>
      toPricingConfig(
        pricingConstants,
        fabricPrices.filter((row) => row.key !== "FABRIC_PRINTING_POLY"),
      ),
    ).toThrow("Missing fabric price: design_type=PRINTING, fabric_type=POLY");
  });
});
