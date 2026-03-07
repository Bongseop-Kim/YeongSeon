import { useEffect, useRef } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckboxField } from "@/components/composite/check-box-field";
import { QuantitySelector } from "@/components/composite/quantity-selector";
import { PackageSelector } from "@/features/custom-order/components/package-selector";
import type { QuoteOrderOptions } from "@/features/custom-order/types/order";
import type { PricingConfig } from "@/features/custom-order/types/pricing";
import type { PackagePreset } from "@/features/custom-order/types/wizard";
import { StepLayout } from "./step-layout";
import { ButtonGroup } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";

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
      <Card>
        <CardHeader>
          <CardTitle>시작 방식</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>수량 선택</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
            <Card>
              <CardContent>
                <CardDescription>
                  100개 이상은 견적요청으로 진행됩니다. 담당자가 별도
                  안내해드려요.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

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
