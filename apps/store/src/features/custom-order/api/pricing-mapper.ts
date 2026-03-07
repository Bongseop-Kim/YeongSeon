import type {
  FabricPriceRow,
  PricingConstantRow,
} from "@/features/custom-order/api/pricing-api";
import type { PricingConfig } from "@/features/custom-order/types/pricing";

type PricingConstantKey =
  | "START_COST"
  | "SEWING_PER_COST"
  | "AUTO_TIE_COST"
  | "TRIANGLE_STITCH_COST"
  | "SIDE_STITCH_COST"
  | "BAR_TACK_COST"
  | "DIMPLE_COST"
  | "SPODERATO_COST"
  | "FOLD7_COST"
  | "WOOL_INTERLINING_COST"
  | "BRAND_LABEL_COST"
  | "CARE_LABEL_COST"
  | "YARN_DYED_DESIGN_COST"
  | "FABRIC_QTY_ADULT"
  | "FABRIC_QTY_ADULT_FOLD7"
  | "FABRIC_QTY_CHILD";

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
  fabricPrices: FabricPriceRow[],
  designType: "YARN_DYED" | "PRINTING",
  fabricType: "SILK" | "POLY",
): number => {
  const priceRow = fabricPrices.find(
    (row) => row.design_type === designType && row.fabric_type === fabricType,
  );

  if (!priceRow) {
    throw new Error(
      `Missing fabric price: design_type=${designType}, fabric_type=${fabricType}`,
    );
  }

  return priceRow.unit_price;
};

export const toPricingConfig = (
  constants: PricingConstantRow[],
  fabricPrices: FabricPriceRow[],
): PricingConfig => {
  const constantsMap: Partial<Record<PricingConstantKey, number>> = {};

  constants.forEach((constant) => {
    if (
      constant.key === "START_COST" ||
      constant.key === "SEWING_PER_COST" ||
      constant.key === "AUTO_TIE_COST" ||
      constant.key === "TRIANGLE_STITCH_COST" ||
      constant.key === "SIDE_STITCH_COST" ||
      constant.key === "BAR_TACK_COST" ||
      constant.key === "DIMPLE_COST" ||
      constant.key === "SPODERATO_COST" ||
      constant.key === "FOLD7_COST" ||
      constant.key === "WOOL_INTERLINING_COST" ||
      constant.key === "BRAND_LABEL_COST" ||
      constant.key === "CARE_LABEL_COST" ||
      constant.key === "YARN_DYED_DESIGN_COST" ||
      constant.key === "FABRIC_QTY_ADULT" ||
      constant.key === "FABRIC_QTY_ADULT_FOLD7" ||
      constant.key === "FABRIC_QTY_CHILD"
    ) {
      constantsMap[constant.key] = constant.amount;
    }
  });

  return {
    START_COST: getConstantValue(constantsMap, "START_COST"),
    SEWING_PER_COST: getConstantValue(constantsMap, "SEWING_PER_COST"),
    AUTO_TIE_COST: getConstantValue(constantsMap, "AUTO_TIE_COST"),
    TRIANGLE_STITCH_COST: getConstantValue(constantsMap, "TRIANGLE_STITCH_COST"),
    SIDE_STITCH_COST: getConstantValue(constantsMap, "SIDE_STITCH_COST"),
    BAR_TACK_COST: getConstantValue(constantsMap, "BAR_TACK_COST"),
    DIMPLE_COST: getConstantValue(constantsMap, "DIMPLE_COST"),
    SPODERATO_COST: getConstantValue(constantsMap, "SPODERATO_COST"),
    FOLD7_COST: getConstantValue(constantsMap, "FOLD7_COST"),
    WOOL_INTERLINING_COST: getConstantValue(constantsMap, "WOOL_INTERLINING_COST"),
    BRAND_LABEL_COST: getConstantValue(constantsMap, "BRAND_LABEL_COST"),
    CARE_LABEL_COST: getConstantValue(constantsMap, "CARE_LABEL_COST"),
    YARN_DYED_DESIGN_COST: getConstantValue(constantsMap, "YARN_DYED_DESIGN_COST"),
    FABRIC_QTY_ADULT: getConstantValue(constantsMap, "FABRIC_QTY_ADULT"),
    FABRIC_QTY_ADULT_FOLD7: getConstantValue(constantsMap, "FABRIC_QTY_ADULT_FOLD7"),
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
  };
};
