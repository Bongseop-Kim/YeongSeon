import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import CostBreakdown from "@/features/custom-order/components/cost-breakdown";
import {
  getFabricLabel,
  getSewingStyleLabel,
  getTieTypeLabel,
} from "@/features/custom-order/utils/option-labels";
import { getEstimatedDays } from "@/features/custom-order/utils/pricing";
import type { OrderOptions } from "@/features/custom-order/types/order";
import type { PricingConfig } from "@/features/custom-order/types/pricing";

interface StickySummaryProps {
  options: OrderOptions;
  totalCost: number;
  sewingCost: number;
  fabricCost: number;
  pricingConfig: PricingConfig | undefined;
  isLoggedIn: boolean;
}

export const StickySummary = ({
  options,
  totalCost,
  sewingCost,
  fabricCost,
  pricingConfig,
  isLoggedIn,
}: StickySummaryProps) => {
  const [searchParams] = useSearchParams();
  const canShowCostBreakdown = searchParams.get("showCostBreakdown") === "true";

  const fabricLabel = getFabricLabel(options);

  const sewingLabel = `${getTieTypeLabel(options.tieType, true)} · ${getSewingStyleLabel(options)}`;

  const grandTotal = totalCost;
  const estimatedDays = getEstimatedDays(options);

  return (
    <Card>
      <CardHeader>
        <CardTitle>주문 요약</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">원단</span>
            <span className="text-zinc-900">{fabricLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">봉제</span>
            <span className="text-zinc-900">{sewingLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">수량</span>
            <span className="text-zinc-900">{options.quantity}개</span>
          </div>
        </div>

        <Separator />

        {isLoggedIn ? (
          <>
            <div className="space-y-2">
              {canShowCostBreakdown && pricingConfig && (
                <CostBreakdown
                  options={options}
                  totalCost={totalCost}
                  sewingCost={sewingCost}
                  fabricCost={fabricCost}
                  pricingConfig={pricingConfig}
                  mode="openCost"
                />
              )}

              <div className="flex justify-between items-center">
                <span className="font-medium text-zinc-900">총비용</span>
                <span className="font-medium text-lg text-zinc-900">
                  {grandTotal.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">단가</span>
                <span className="text-sm text-zinc-900">
                  {options.quantity > 0
                    ? `${Math.round(totalCost / options.quantity).toLocaleString()}원/개`
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">예상 제작 기간</span>
                <span className="text-sm font-medium text-zinc-900">
                  {estimatedDays}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-zinc-500">
              로그인하면 예상 비용을 확인할 수 있어요
            </p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">예상 제작 기간</span>
              <span className="text-sm font-medium text-zinc-900">
                {estimatedDays}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
