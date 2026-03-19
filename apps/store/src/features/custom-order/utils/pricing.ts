import type { OrderOptions } from "@/features/custom-order/types/order";
import type { PricingConfig } from "@/features/custom-order/types/pricing";

export interface CostCalculation {
  sewingCost: number;
  fabricCost: number;
  totalCost: number;
}

export const calculateSewingCost = (
  options: OrderOptions,
  config: PricingConfig,
): number => {
  let sewingPerCost = config.SEWING_PER_COST;

  if (options.tieType === "AUTO") sewingPerCost += config.AUTO_TIE_COST;
  if (options.triangleStitch) sewingPerCost += config.TRIANGLE_STITCH_COST;
  if (options.sideStitch) sewingPerCost += config.SIDE_STITCH_COST;
  if (options.barTack) sewingPerCost += config.BAR_TACK_COST;
  if (options.dimple) sewingPerCost += config.DIMPLE_COST;
  if (options.spoderato) sewingPerCost += config.SPODERATO_COST;
  if (options.fold7) sewingPerCost += config.FOLD7_COST;
  if (options.interlining === "WOOL")
    sewingPerCost += config.WOOL_INTERLINING_COST;
  if (options.brandLabel) sewingPerCost += config.BRAND_LABEL_COST;
  if (options.careLabel) sewingPerCost += config.CARE_LABEL_COST;

  return sewingPerCost * options.quantity + config.START_COST;
};

export const calculateFabricCost = (
  options: OrderOptions,
  config: PricingConfig,
): number => {
  if (options.fabricProvided || !options.designType || !options.fabricType)
    return 0;

  const designCost =
    options.designType === "YARN_DYED" ? config.YARN_DYED_DESIGN_COST : 0;
  const unitFabricCost =
    config.FABRIC_COST[options.designType][options.fabricType];

  let qtyPerMa: number;
  if (options.sizeType === "CHILD") {
    qtyPerMa = config.FABRIC_QTY_CHILD;
  } else if (options.fold7) {
    qtyPerMa = config.FABRIC_QTY_ADULT_FOLD7;
  } else {
    qtyPerMa = config.FABRIC_QTY_ADULT;
  }

  const fabricCost = Math.round((options.quantity * unitFabricCost) / qtyPerMa);

  return fabricCost + designCost;
};

export const getEstimatedDays = (
  options: Pick<OrderOptions, "fabricProvided" | "reorder">,
): string => {
  if (options.fabricProvided) return "7~14일";
  if (options.reorder) return "21~28일";
  return "28~42일";
};

export const calculateTotalCost = (
  options: OrderOptions,
  config: PricingConfig,
): CostCalculation => {
  const sewingCost = calculateSewingCost(options, config);
  const fabricCost = calculateFabricCost(options, config);
  const totalCost = sewingCost + fabricCost;

  return {
    sewingCost,
    fabricCost,
    totalCost,
  };
};
