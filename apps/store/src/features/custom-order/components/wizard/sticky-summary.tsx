import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import CostBreakdown from "@/features/custom-order/components/cost-breakdown";
import { SAMPLE_COST } from "@/features/custom-order/constants/SAMPLE_PRICING";
import {
  getFabricLabel,
  getSewingStyleLabel,
  getTieTypeLabel,
} from "@/features/custom-order/utils/option-labels";
import { getEstimatedDays } from "@/features/custom-order/utils/pricing";
import type { OrderOptions } from "@/features/custom-order/types/order";

interface StickySummaryProps {
  options: OrderOptions;
  totalCost: number;
  sewingCost: number;
  fabricCost: number;
  isLoggedIn: boolean;
  isQuoteMode: boolean;
}

export const StickySummary = ({
  options,
  totalCost,
  sewingCost,
  fabricCost,
  isLoggedIn,
  isQuoteMode,
}: StickySummaryProps) => {
  const [searchParams] = useSearchParams();
  const canShowCostBreakdown = searchParams.get("showCostBreakdown") === "true";

  const fabricLabel = getFabricLabel(options);

  const sewingLabel = options.tieType
    ? `${getTieTypeLabel(options.tieType, true)} · ${getSewingStyleLabel(options)}`
    : "미선택";

  const sampleCost = !isQuoteMode && options.sample && options.sampleType
    ? SAMPLE_COST[options.sampleType]
    : 0;
  const grandTotal = totalCost + sampleCost;
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
              {sampleCost > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-zinc-900">제작 비용</span>
                    <span className="font-medium text-zinc-900">
                      {totalCost.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-500">샘플 비용</span>
                    <span className="text-sm text-zinc-900">
                      +{sampleCost.toLocaleString()}원
                    </span>
                  </div>
                </>
              )}
              {canShowCostBreakdown && (
                <CostBreakdown
                  options={options}
                  totalCost={totalCost}
                  sewingCost={sewingCost}
                  fabricCost={fabricCost}
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
