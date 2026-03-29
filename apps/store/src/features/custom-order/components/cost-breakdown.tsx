import { type ReactNode } from "react";
import type { OrderOptions, PricingConfig } from "@/entities/custom-order";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

interface CostBreakdownProps {
  options: OrderOptions;
  totalCost: number;
  sewingCost: number;
  fabricCost: number;
  pricingConfig: PricingConfig;
  mode?: string | null;
}

const rowClass =
  "flex items-center justify-between gap-4 text-sm text-foreground-subtle";
const valueClass = "text-right font-medium text-foreground";

function CostRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={rowClass}>
      <span>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

const CostBreakdown = ({
  options,
  totalCost,
  sewingCost,
  fabricCost,
  pricingConfig,
  mode,
}: CostBreakdownProps) => {
  const isOpenCostMode = mode === "openCost";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          비용
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isOpenCostMode && (
          <>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">봉제 비용</h3>
              <div className="space-y-2">
                <CostRow
                  label="기본 봉제 비용"
                  value={`${pricingConfig.SEWING_PER_COST.toLocaleString()}원 × ${options.quantity}개`}
                />
                <CostRow
                  label="봉제 시작 비용"
                  value={`${pricingConfig.START_COST.toLocaleString()}원`}
                />
                {options.tieType === "AUTO" && (
                  <CostRow
                    label="자동 타이 추가"
                    value={`+${pricingConfig.AUTO_TIE_COST.toLocaleString()}원 × ${options.quantity}개`}
                  />
                )}
                {options.triangleStitch && (
                  <CostRow
                    label="삼각 봉제"
                    value={`+${pricingConfig.TRIANGLE_STITCH_COST.toLocaleString()}원 × ${options.quantity}개`}
                  />
                )}
                {options.sideStitch && (
                  <CostRow
                    label="옆선 봉제"
                    value={`+${pricingConfig.SIDE_STITCH_COST.toLocaleString()}원 × ${options.quantity}개`}
                  />
                )}
                {options.dimple && (
                  <CostRow
                    label="딤플"
                    value={`${pricingConfig.DIMPLE_COST.toLocaleString()}원 × ${options.quantity}개`}
                  />
                )}
                {options.spoderato && (
                  <CostRow
                    label="스포데라토"
                    value={`${pricingConfig.SPODERATO_COST.toLocaleString()}원 × ${options.quantity}개`}
                  />
                )}
                {options.fold7 && (
                  <CostRow
                    label="7폴드"
                    value={`${pricingConfig.FOLD7_COST.toLocaleString()}원 × ${options.quantity}개`}
                  />
                )}
                {options.interlining === "WOOL" && (
                  <CostRow
                    label="울 심지 추가"
                    value={`+${pricingConfig.WOOL_INTERLINING_COST.toLocaleString()}원 × ${options.quantity}개`}
                  />
                )}
                {options.brandLabel && (
                  <CostRow
                    label="브랜드 라벨"
                    value={`+${pricingConfig.BRAND_LABEL_COST.toLocaleString()}원 × ${options.quantity}개`}
                  />
                )}
                {options.careLabel && (
                  <CostRow
                    label="케어 라벨"
                    value={`+${pricingConfig.CARE_LABEL_COST.toLocaleString()}원 × ${options.quantity}개`}
                  />
                )}
                <Separator />
                <div className={rowClass}>
                  <span className="font-medium text-foreground">
                    봉제 비용 합계
                  </span>
                  <span className={valueClass}>
                    {sewingCost.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {!options.fabricProvided && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">
                  원단 비용
                </h3>
                <div className="space-y-2">
                  <CostRow
                    label={`원단 단가 (${options.quantity / 4}마)`}
                    value={`${options.designType && options.fabricType ? pricingConfig.FABRIC_COST[options.designType][options.fabricType].toLocaleString() : 0}원 × ${options.quantity / 4}마`}
                  />
                  {options.designType === "YARN_DYED" && (
                    <CostRow
                      label="선염 디자인 비용"
                      value={`${pricingConfig.YARN_DYED_DESIGN_COST.toLocaleString()}원`}
                    />
                  )}
                  <Separator />
                  <div className={rowClass}>
                    <span className="font-medium text-foreground">
                      원단 비용 합계
                    </span>
                    <span className={valueClass}>
                      {fabricCost.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Separator />
          </>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium text-foreground">총비용</span>
            <span className="text-lg font-medium text-foreground">
              {totalCost.toLocaleString()}원
            </span>
          </div>

          <div className={rowClass}>
            <span className="font-medium text-foreground">단가</span>
            <span className={valueClass}>
              {(totalCost / options.quantity).toLocaleString()}원
            </span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className={rowClass}>
            <span className="font-medium text-foreground">예상 제작 기간</span>
            <span className={valueClass}>
              {options.fabricProvided
                ? "7~14일"
                : options.reorder
                  ? "21~28일"
                  : "28~42일"}
            </span>
          </div>
          {isOpenCostMode && (
            <p className="text-xs leading-relaxed text-foreground-muted">
              {options.fabricProvided
                ? "고객 제공 원단으로 제작되는 경우 봉제 작업만 진행되어 비교적 빠른 제작이 가능합니다."
                : options.reorder
                  ? "재주문의 경우 기존 디자인을 활용하여 원단 제작이 진행됩니다."
                  : "새로운 디자인의 경우 원단 디자인 작업부터 시작하여 원단 제작, 봉제 작업까지 순차적으로 진행됩니다."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CostBreakdown;
