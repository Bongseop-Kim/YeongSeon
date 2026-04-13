import { useSearchParams } from "react-router-dom";
import type { OrderOptions, PricingConfig } from "@/entities/custom-order";
import CostBreakdown from "@/features/custom-order/components/cost-breakdown";
import { getEstimatedDays } from "@/features/custom-order/utils/pricing";

interface CustomOrderCostFooterProps {
  options: OrderOptions;
  totalCost: number;
  sewingCost: number;
  fabricCost: number;
  pricingConfig: PricingConfig | undefined;
  isLoggedIn: boolean;
}

export function CustomOrderCostFooter({
  options,
  totalCost,
  sewingCost,
  fabricCost,
  pricingConfig,
  isLoggedIn,
}: CustomOrderCostFooterProps) {
  const [searchParams] = useSearchParams();
  const canShowCostBreakdown = searchParams.get("showCostBreakdown") === "true";
  const estimatedDays = getEstimatedDays(options);

  if (!isLoggedIn) {
    return (
      <div className="mt-5 border-t border-stone-200 pt-4">
        <p className="text-sm text-zinc-500">
          로그인하면 예상 비용을 확인할 수 있어요
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-zinc-500">예상 제작 기간</span>
          <span className="font-medium text-zinc-900">{estimatedDays}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {canShowCostBreakdown && pricingConfig ? (
        <CostBreakdown
          options={options}
          totalCost={totalCost}
          sewingCost={sewingCost}
          fabricCost={fabricCost}
          pricingConfig={pricingConfig}
          mode="openCost"
        />
      ) : null}
      <div className="border-t border-stone-200 pt-4">
        <div className="flex items-end justify-between gap-3">
          <span className="text-sm font-medium text-zinc-900">예상 총비용</span>
          <span className="text-2xl font-semibold tracking-tight text-zinc-950">
            {totalCost.toLocaleString()}원
          </span>
        </div>
        <div className="mt-3 space-y-1 text-sm text-zinc-600">
          <div className="flex items-center justify-between gap-3">
            <span>단가</span>
            <span className="text-zinc-900">
              {options.quantity > 0
                ? `${Math.round(totalCost / options.quantity).toLocaleString()}원/개`
                : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>예상 제작 기간</span>
            <span className="font-medium text-zinc-900">{estimatedDays}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
