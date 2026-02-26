import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp } from "lucide-react";
import CostBreakdown from "@/features/custom-order/components/CostBreakdown";
import { SAMPLE_COST } from "@/features/custom-order/constants/SAMPLE_PRICING";
import { getEstimatedDays } from "@/features/custom-order/utils/pricing";
import type { OrderOptions } from "@/features/custom-order/types/order";

interface StickySummaryProps {
  options: OrderOptions;
  totalCost: number;
  sewingCost: number;
  fabricCost: number;
  isLoggedIn: boolean;
  isSampleMode?: boolean;
}

export const StickySummary = ({
  options,
  totalCost,
  sewingCost,
  fabricCost,
  isLoggedIn,
  isSampleMode = false,
}: StickySummaryProps) => {
  const [showDetail, setShowDetail] = useState(false);

  const fabricLabel = options.fabricProvided
    ? "원단 직접 제공"
    : options.reorder
      ? "재주문"
      : options.fabricType && options.designType
        ? [
            options.fabricType === "SILK" ? "실크" : "폴리",
            options.designType === "YARN_DYED" ? "선염" : "날염",
          ].join(" · ")
        : "미선택";

  const sewingLabel = options.tieType
    ? [
        options.tieType === "AUTO" ? "자동" : "수동",
        options.dimple
          ? "딤플"
          : options.spoderato
            ? "스포데라토"
            : options.fold7
              ? "7폴드"
              : "일반",
      ].join(" · ")
    : "미선택";

  const sampleCost = options.sampleType ? SAMPLE_COST[options.sampleType] : 0;
  const estimatedDays = getEstimatedDays(options, isSampleMode);

  const displayCost = isSampleMode ? sampleCost : totalCost;

  return (
    <Card className="w-full">
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2 text-sm">
          {isSampleMode && options.sampleType && (
            <div className="flex justify-between">
              <span className="text-zinc-500">샘플 유형</span>
              <span className="text-zinc-900">
                {options.sampleType === "sewing"
                  ? "봉제 샘플"
                  : options.sampleType === "fabric"
                    ? "원단 샘플"
                    : "원단 + 봉제 샘플"}
              </span>
            </div>
          )}
          {(!isSampleMode || options.sampleType !== "fabric") && (
            <>
              <div className="flex justify-between">
                <span className="text-zinc-500">원단</span>
                <span className="text-zinc-900">{fabricLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">봉제</span>
                <span className="text-zinc-900">{sewingLabel}</span>
              </div>
            </>
          )}
          {!isSampleMode && (
            <div className="flex justify-between">
              <span className="text-zinc-500">수량</span>
              <span className="text-zinc-900">{options.quantity}개</span>
            </div>
          )}
        </div>

        <Separator />

        {isSampleMode ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-zinc-900">고정 비용</span>
              <span className="font-medium text-lg text-zinc-900">
                {sampleCost.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">예상 기간</span>
              <span className="text-sm font-medium text-zinc-900">
                {estimatedDays}
              </span>
            </div>
          </div>
        ) : isLoggedIn ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-zinc-900">총비용</span>
                <span className="font-medium text-lg text-zinc-900">
                  {displayCost.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-500">단가</span>
                <span className="text-sm text-zinc-900">
                  {options.quantity > 0
                    ? `${Math.round(displayCost / options.quantity).toLocaleString()}원/개`
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

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-zinc-500"
              onClick={() => setShowDetail((prev) => !prev)}
            >
              {showDetail ? (
                <>
                  상세 비용 접기 <ChevronUp className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  상세 비용 보기 <ChevronDown className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>

            {showDetail && (
              <CostBreakdown
                options={options}
                totalCost={totalCost}
                sewingCost={sewingCost}
                fabricCost={fabricCost}
                mode="openCost"
              />
            )}
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
