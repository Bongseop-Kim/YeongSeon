import { useEffect, useRef } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { CheckboxField } from "@/shared/composite/check-box-field";
import { QuantitySelector } from "@/shared/composite/quantity-selector";
import { UtilityPagePanel } from "@/shared/composite/utility-page";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Button } from "@/shared/ui-extended/button";

const QUANTITY_PRESETS = [4, 8, 12, 20, 50, 100] as const;

export const QuantityStep = () => {
  const { control, watch, setValue } = useFormContext<QuoteOrderOptions>();
  const quantity = watch("quantity");
  const fabricProvided = watch("fabricProvided");
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
    <div className="space-y-6">
      <UtilityPagePanel title="시작 방식">
        <div className="space-y-3">
          <CheckboxField
            name="fabricProvided"
            control={control}
            label="원단 직접 제공"
          />
          <CheckboxField
            name="reorder"
            control={control}
            label="재주문"
            disabled={fabricProvided}
          />
        </div>
      </UtilityPagePanel>

      <UtilityPagePanel title="수량 선택" contentClassName="space-y-4">
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
      </UtilityPagePanel>
    </div>
  );
};
