import type { OrderOptions } from "@/features/custom-order/types/order";
import {
  START_COST,
  SEWING_PER_COST,
  AUTO_TIE_COST,
  TRIANGLE_STITCH_COST,
  SIDE_STITCH_COST,
  DIMPLE_COST,
  SPODERATO_COST,
  FOLD7_COST,
  WOOL_INTERLINING_COST,
  BRAND_LABEL_COST,
  CARE_LABEL_COST,
  YARN_DYED_DESIGN_COST,
  FABRIC_COST,
  BAR_TACK_COST,
} from "@yeongseon/shared/constants/custom-order-pricing";

export interface CostCalculation {
  sewingCost: number;
  fabricCost: number;
  totalCost: number;
}

export const calculateSewingCost = (options: OrderOptions): number => {
  let sewingPerCost = SEWING_PER_COST;

  if (options.tieType === "AUTO") sewingPerCost += AUTO_TIE_COST;
  if (options.triangleStitch) sewingPerCost += TRIANGLE_STITCH_COST;
  if (options.sideStitch) sewingPerCost += SIDE_STITCH_COST;
  if (options.barTack) sewingPerCost += BAR_TACK_COST;
  if (options.dimple) sewingPerCost = DIMPLE_COST;
  if (options.spoderato) sewingPerCost = SPODERATO_COST;
  if (options.fold7) sewingPerCost = FOLD7_COST;
  if (options.interlining === "WOOL") sewingPerCost += WOOL_INTERLINING_COST;
  if (options.brandLabel) sewingPerCost += BRAND_LABEL_COST;
  if (options.careLabel) sewingPerCost += CARE_LABEL_COST;

  return sewingPerCost * options.quantity + START_COST;
};

export const calculateFabricCost = (options: OrderOptions): number => {
  if (options.fabricProvided || !options.designType || !options.fabricType)
    return 0;

  const designCost =
    options.designType === "YARN_DYED" ? YARN_DYED_DESIGN_COST : 0;
  const unitFabricCost = FABRIC_COST[options.designType][options.fabricType];
  const fabricQuantity = options.quantity / 4;

  return fabricQuantity * unitFabricCost + designCost;
};

export const calculateTotalCost = (options: OrderOptions): CostCalculation => {
  const sewingCost = calculateSewingCost(options);
  const fabricCost = calculateFabricCost(options);
  const totalCost = sewingCost + fabricCost;

  return {
    sewingCost,
    fabricCost,
    totalCost,
  };
};
