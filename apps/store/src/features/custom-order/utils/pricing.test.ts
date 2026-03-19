import { describe, expect, it } from "vitest";
import {
  calculateFabricCost,
  calculateSewingCost,
  calculateTotalCost,
  getEstimatedDays,
} from "@/features/custom-order/utils/pricing";

const config = {
  SEWING_PER_COST: 1000,
  AUTO_TIE_COST: 200,
  TRIANGLE_STITCH_COST: 10,
  SIDE_STITCH_COST: 20,
  BAR_TACK_COST: 30,
  DIMPLE_COST: 40,
  SPODERATO_COST: 50,
  FOLD7_COST: 60,
  WOOL_INTERLINING_COST: 70,
  BRAND_LABEL_COST: 80,
  CARE_LABEL_COST: 90,
  START_COST: 500,
  YARN_DYED_DESIGN_COST: 300,
  FABRIC_COST: {
    PRINTING: { SILK: 1000, POLY: 500 },
    YARN_DYED: { SILK: 2000, POLY: 800 },
  },
  FABRIC_QTY_CHILD: 2,
  FABRIC_QTY_ADULT_FOLD7: 4,
  FABRIC_QTY_ADULT: 3,
  SAMPLE_SEWING_COST: 0,
  SAMPLE_FABRIC_PRINTING_COST: 0,
  SAMPLE_FABRIC_YARN_DYED_COST: 0,
  SAMPLE_FABRIC_AND_SEWING_PRINTING_COST: 0,
  SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST: 0,
};

const baseOptions = {
  fabricProvided: false,
  reorder: false,
  fabricType: "SILK" as const,
  designType: "PRINTING" as const,
  tieType: null,
  interlining: null,
  interliningThickness: null,
  sizeType: "ADULT" as const,
  tieWidth: 8,
  triangleStitch: false,
  sideStitch: false,
  barTack: false,
  fold7: false,
  dimple: false,
  spoderato: false,
  brandLabel: false,
  careLabel: false,
  quantity: 3,
  referenceImages: null,
  additionalNotes: "",
};

describe("pricing utils", () => {
  it("봉제비를 옵션별로 합산한다", () => {
    expect(
      calculateSewingCost(
        {
          ...baseOptions,
          tieType: "AUTO",
          triangleStitch: true,
          sideStitch: true,
          barTack: true,
          dimple: true,
          spoderato: true,
          fold7: true,
          interlining: "WOOL",
          brandLabel: true,
          careLabel: true,
        },
        config,
      ),
    ).toBe((1000 + 200 + 10 + 20 + 30 + 40 + 50 + 60 + 70 + 80 + 90) * 3 + 500);
  });

  it("원단비를 계산한다", () => {
    expect(calculateFabricCost(baseOptions, config)).toBe(1000);
    expect(
      calculateFabricCost(
        {
          ...baseOptions,
          designType: "YARN_DYED",
          quantity: 4,
          sizeType: "CHILD",
        },
        config,
      ),
    ).toBe(4300);
    expect(
      calculateFabricCost(
        {
          ...baseOptions,
          fold7: true,
          quantity: 4,
          designType: "PRINTING",
          fabricType: "POLY",
        },
        config,
      ),
    ).toBe(500);
    expect(
      calculateFabricCost({ ...baseOptions, fabricProvided: true }, config),
    ).toBe(0);
  });

  it("예상 제작일을 계산한다", () => {
    expect(getEstimatedDays({ fabricProvided: true, reorder: false })).toBe(
      "7~14일",
    );
    expect(getEstimatedDays({ fabricProvided: false, reorder: true })).toBe(
      "21~28일",
    );
    expect(getEstimatedDays({ fabricProvided: false, reorder: false })).toBe(
      "28~42일",
    );
  });

  it("총비용을 계산한다", () => {
    expect(calculateTotalCost(baseOptions, config)).toEqual({
      sewingCost: 3500,
      fabricCost: 1000,
      totalCost: 4500,
    });
  });
});
