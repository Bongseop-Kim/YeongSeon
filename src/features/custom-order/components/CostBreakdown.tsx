import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OrderOptions } from "../types/order";
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
} from "../constants/PRICING";

interface CostBreakdownProps {
  options: OrderOptions;
  totalCost: number;
  sewingCost: number;
  fabricCost: number;
}

const CostBreakdown = ({
  options,
  totalCost,
  sewingCost,
  fabricCost,
}: CostBreakdownProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-stone-900">
          비용 산정 내역
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 봉제 비용 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-stone-900">봉제 비용</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-600">기본 봉제 비용</span>
              <span className="text-sm">
                {SEWING_PER_COST.toLocaleString()}원 × {options.quantity}개
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-stone-600">봉제 시작 비용</span>
              <span className="text-sm">{START_COST.toLocaleString()}원</span>
            </div>
            {options.tieType === "AUTO" && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">자동 봉제 추가</span>
                <span className="text-sm">
                  +{AUTO_TIE_COST.toLocaleString()}원 × {options.quantity}개
                </span>
              </div>
            )}
            {options.triangleStitch && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">삼각 봉제</span>
                <span className="text-sm">
                  +{TRIANGLE_STITCH_COST.toLocaleString()}원 ×{" "}
                  {options.quantity}개
                </span>
              </div>
            )}
            {options.sideStitch && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">옆선 봉제</span>
                <span className="text-sm">
                  +{SIDE_STITCH_COST.toLocaleString()}원 × {options.quantity}개
                </span>
              </div>
            )}
            {options.dimple && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">딤플</span>
                <span className="text-sm">
                  {DIMPLE_COST.toLocaleString()}원 × {options.quantity}개
                </span>
              </div>
            )}
            {options.spoderato && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">스포데라토</span>
                <span className="text-sm">
                  {SPODERATO_COST.toLocaleString()}원 × {options.quantity}개
                </span>
              </div>
            )}
            {options.fold7 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">7폴드</span>
                <span className="text-sm">
                  {FOLD7_COST.toLocaleString()}원 × {options.quantity}개
                </span>
              </div>
            )}
            {options.interlining === "WOOL" && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">울 심지 추가</span>
                <span className="text-sm">
                  +{WOOL_INTERLINING_COST.toLocaleString()}원 ×{" "}
                  {options.quantity}개
                </span>
              </div>
            )}
            {options.brandLabel && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">브랜드 라벨</span>
                <span className="text-sm">
                  +{BRAND_LABEL_COST.toLocaleString()}원 × {options.quantity}개
                </span>
              </div>
            )}
            {options.careLabel && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">케어 라벨</span>
                <span className="text-sm">
                  +{CARE_LABEL_COST.toLocaleString()}원 × {options.quantity}개
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-stone-900">
                봉제 비용 합계
              </span>
              <span className="text-sm font-medium">
                {sewingCost.toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* 원단 비용 */}
        {!options.fabricProvided && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-stone-900">원단 비용</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-stone-600">
                  원단 단가 ({options.quantity / 4}마)
                </span>
                <span className="text-sm">
                  {options.designType && options.fabricType
                    ? FABRIC_COST[options.designType][
                        options.fabricType
                      ].toLocaleString()
                    : 0}
                  원 × {options.quantity / 4}마
                </span>
              </div>
              {options.designType === "YARN_DYED" && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-stone-600">
                    선염 디자인 비용
                  </span>
                  <span className="text-sm">
                    {YARN_DYED_DESIGN_COST.toLocaleString()}원
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-stone-900">
                  원단 비용 합계
                </span>
                <span className="text-sm font-medium">
                  {fabricCost.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* 총 비용 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium text-stone-900">총 비용</span>
            <span className="font-medium text-lg text-stone-900">
              {totalCost.toLocaleString()}원
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-stone-900">단가</span>
            <span className="text-sm">
              {(totalCost / options.quantity).toLocaleString()}원
            </span>
          </div>
        </div>

        <Separator />

        {/* 제작 기간 설명 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-stone-900">
              예상 제작 기간
            </span>
            <span className="text-sm font-medium">
              {options.fabricProvided
                ? "7~14일"
                : options.reorder
                ? "21~28일"
                : "28~42일"}
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            {options.fabricProvided
              ? "고객 제공 원단으로 제작되는 경우 봉제 작업만 진행되어 비교적 빠른 제작이 가능합니다."
              : options.reorder
              ? "재주문의 경우 기존 디자인을 활용하여 원단 제작이 진행됩니다."
              : "새로운 디자인의 경우 원단 디자인 작업부터 시작하여 원단 제작, 봉제 작업까지 순차적으로 진행됩니다."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CostBreakdown;
