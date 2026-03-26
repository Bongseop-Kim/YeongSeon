import { useEffect, useRef } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { CheckboxField } from "@/components/composite/check-box-field";
import { QuantitySelector } from "@/components/composite/quantity-selector";
import { PackageSelector } from "@/features/custom-order/components/package-selector";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { PricingConfig } from "@/features/custom-order/types/pricing";
import type { PackagePreset } from "@/features/custom-order/types/wizard";
import { StepLayout } from "./step-layout";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui-extended/button";

const QUANTITY_PRESETS = [4, 8, 12, 20, 50, 100] as const;

interface QuantityStepProps {
  isLoggedIn: boolean;
  selectedPackage: PackagePreset | null;
  onSelectPackage: (preset: PackagePreset) => void;
  pricingConfig: PricingConfig | undefined;
}

export const QuantityStep = ({
  isLoggedIn,
  selectedPackage,
  onSelectPackage,
  pricingConfig,
}: QuantityStepProps) => {
  const { control, watch, setValue } = useFormContext<QuoteOrderOptions>();
  const quantity = watch("quantity");
  const fabricProvided = watch("fabricProvided");
  const reorder = watch("reorder");
  const prevFabricProvided = useRef(fabricProvided);

  // fabricProvided true 전환 시 연관 필드 리셋
  useEffect(() => {
    if (fabricProvided && !prevFabricProvided.current) {
      setValue("reorder", false);
      setValue("fabricType", null);
      setValue("designType", null);
    }
    prevFabricProvided.current = fabricProvided;
  }, [fabricProvided, setValue]);

  const handlePresetClick = (preset: number) => {
    setValue("quantity", preset);
  };

  return (
    <StepLayout
      guideTitle="결정 가이드"
      guideItems={[
        "4개, 8개, 12개처럼 기본 단위 추천",
        "100개 이상은 견적요청으로 전환",
        "시작 방식 선택 후 패키지 추천 사용",
      ]}
    >
      <section>
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
            시작 방식
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            원단 보유 여부와 재주문 여부를 먼저 정하면 이후 단계가 간결해집니다.
          </p>
        </div>
        <div className="mt-5 space-y-3 border-y border-stone-200 py-4">
          <CheckboxField
            name="fabricProvided"
            control={control}
            label="원단 직접 제공"
            description="보유한 원단을 보내주시면 봉제만 진행합니다"
          />
          <CheckboxField
            name="reorder"
            control={control}
            label="재주문"
            description="이전에 주문한 동일 디자인으로 재주문합니다"
            disabled={fabricProvided}
          />
        </div>
      </section>

      <section>
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold tracking-tight text-zinc-950">
            수량 선택
          </h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            기본 단위로 빠르게 선택하거나 직접 조절해 예상 단가를 확인하세요.
          </p>
        </div>
        <div className="mt-5 space-y-4">
          <ButtonGroup>
            {QUANTITY_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={quantity === preset ? "default" : "outline"}
                onClick={() => handlePresetClick(preset)}
              >
                {preset}개
              </Button>
            ))}
          </ButtonGroup>

          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <QuantitySelector value={field.value} onChange={field.onChange} />
            )}
          />

          {quantity >= 100 && (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                100개 이상은 견적요청으로 전환됩니다. 수량 확정 후 담당자가 세부
                사양과 일정을 안내합니다.
              </p>
            </div>
          )}
        </div>
      </section>

      {!fabricProvided && !reorder && (
        <PackageSelector
          quantity={quantity}
          isLoggedIn={isLoggedIn}
          selectedPackage={selectedPackage}
          onSelectPackage={onSelectPackage}
          pricingConfig={pricingConfig}
        />
      )}
    </StepLayout>
  );
};
