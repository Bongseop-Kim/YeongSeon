import type { OrderOptions } from "@/entities/custom-order";
import type { SummaryRow } from "@/shared/composite/order-summary-utils";
import {
  getFabricLabel,
  getSewingStyleLabel,
  getTieTypeLabel,
} from "@/features/custom-order/utils/option-labels";

export function useCustomOrderSummaryRows(options: OrderOptions): SummaryRow[] {
  const fabricLabel = getFabricLabel(options);
  const tieTypeLabel =
    options.tieType == null ? "미선택" : getTieTypeLabel(options.tieType, true);
  const sewingLabel = `${tieTypeLabel} · ${getSewingStyleLabel(options)}`;

  return [
    { id: "fabric", label: "원단", value: fabricLabel },
    { id: "sewing", label: "봉제", value: sewingLabel },
    { id: "quantity", label: "수량", value: `${options.quantity}개` },
  ];
}
