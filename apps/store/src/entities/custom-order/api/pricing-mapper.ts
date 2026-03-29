import type { PricingConstantRow } from "@/entities/custom-order/api/pricing-api";
import type { PricingConfig } from "@/entities/custom-order/model/pricing";

const ALLOWED_PRICING_KEYS = [
  "START_COST",
  "SEWING_PER_COST",
  "AUTO_TIE_COST",
  "TRIANGLE_STITCH_COST",
  "SIDE_STITCH_COST",
  "BAR_TACK_COST",
  "DIMPLE_COST",
  "SPODERATO_COST",
  "FOLD7_COST",
  "WOOL_INTERLINING_COST",
  "BRAND_LABEL_COST",
  "CARE_LABEL_COST",
  "YARN_DYED_DESIGN_COST",
  "FABRIC_QTY_ADULT",
  "FABRIC_QTY_ADULT_FOLD7",
  "FABRIC_QTY_CHILD",
  "SAMPLE_SEWING_COST",
  "SAMPLE_FABRIC_PRINTING_COST",
  "SAMPLE_FABRIC_YARN_DYED_COST",
  "SAMPLE_FABRIC_AND_SEWING_PRINTING_COST",
  "SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST",
] as const;

type PricingConstantKey = (typeof ALLOWED_PRICING_KEYS)[number];

const isPricingConstantKey = (key: string): key is PricingConstantKey =>
  ALLOWED_PRICING_KEYS.includes(key as PricingConstantKey);

const getConstantValue = (
  constantsMap: Partial<Record<PricingConstantKey, number>>,
  key: PricingConstantKey,
): number => {
  const value = constantsMap[key];

  if (value === undefined) {
    throw new Error(`Missing pricing constant: ${key}`);
  }

  return value;
};

const getFabricUnitPrice = (
  fabricPrices: PricingConstantRow[],
  designType: "YARN_DYED" | "PRINTING",
  fabricType: "SILK" | "POLY",
): number => {
  const targetKey = `FABRIC_${designType}_${fabricType}`;
  const priceRow = fabricPrices.find((row) => row.key === targetKey);

  if (!priceRow) {
    throw new Error(
      `Missing fabric price: design_type=${designType}, fabric_type=${fabricType}`,
    );
  }

  return priceRow.amount;
};

export const toPricingConfig = (
  constants: PricingConstantRow[],
  fabricPrices: PricingConstantRow[],
): PricingConfig => {
  const constantsMap: Partial<Record<PricingConstantKey, number>> = {};

  constants.forEach((constant) => {
    if (isPricingConstantKey(constant.key)) {
      constantsMap[constant.key] = constant.amount;
    }
  });

  return {
    START_COST: getConstantValue(constantsMap, "START_COST"),
    SEWING_PER_COST: getConstantValue(constantsMap, "SEWING_PER_COST"),
    AUTO_TIE_COST: getConstantValue(constantsMap, "AUTO_TIE_COST"),
    TRIANGLE_STITCH_COST: getConstantValue(
      constantsMap,
      "TRIANGLE_STITCH_COST",
    ),
    SIDE_STITCH_COST: getConstantValue(constantsMap, "SIDE_STITCH_COST"),
    BAR_TACK_COST: getConstantValue(constantsMap, "BAR_TACK_COST"),
    DIMPLE_COST: getConstantValue(constantsMap, "DIMPLE_COST"),
    SPODERATO_COST: getConstantValue(constantsMap, "SPODERATO_COST"),
    FOLD7_COST: getConstantValue(constantsMap, "FOLD7_COST"),
    WOOL_INTERLINING_COST: getConstantValue(
      constantsMap,
      "WOOL_INTERLINING_COST",
    ),
    BRAND_LABEL_COST: getConstantValue(constantsMap, "BRAND_LABEL_COST"),
    CARE_LABEL_COST: getConstantValue(constantsMap, "CARE_LABEL_COST"),
    YARN_DYED_DESIGN_COST: getConstantValue(
      constantsMap,
      "YARN_DYED_DESIGN_COST",
    ),
    FABRIC_QTY_ADULT: getConstantValue(constantsMap, "FABRIC_QTY_ADULT"),
    FABRIC_QTY_ADULT_FOLD7: getConstantValue(
      constantsMap,
      "FABRIC_QTY_ADULT_FOLD7",
    ),
    FABRIC_QTY_CHILD: getConstantValue(constantsMap, "FABRIC_QTY_CHILD"),
    FABRIC_COST: {
      YARN_DYED: {
        SILK: getFabricUnitPrice(fabricPrices, "YARN_DYED", "SILK"),
        POLY: getFabricUnitPrice(fabricPrices, "YARN_DYED", "POLY"),
      },
      PRINTING: {
        SILK: getFabricUnitPrice(fabricPrices, "PRINTING", "SILK"),
        POLY: getFabricUnitPrice(fabricPrices, "PRINTING", "POLY"),
      },
    },
    SAMPLE_SEWING_COST: getConstantValue(constantsMap, "SAMPLE_SEWING_COST"),
    SAMPLE_FABRIC_PRINTING_COST: getConstantValue(
      constantsMap,
      "SAMPLE_FABRIC_PRINTING_COST",
    ),
    SAMPLE_FABRIC_YARN_DYED_COST: getConstantValue(
      constantsMap,
      "SAMPLE_FABRIC_YARN_DYED_COST",
    ),
    SAMPLE_FABRIC_AND_SEWING_PRINTING_COST: getConstantValue(
      constantsMap,
      "SAMPLE_FABRIC_AND_SEWING_PRINTING_COST",
    ),
    SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST: getConstantValue(
      constantsMap,
      "SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST",
    ),
  };
};
