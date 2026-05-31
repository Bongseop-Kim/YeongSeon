import { useEffect, useRef } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { QuoteOrderOptions } from "@/entities/custom-order";
import { CheckboxField } from "@/shared/composite/check-box-field";
import { QuantitySelector } from "@/shared/composite/quantity-selector";
import { UtilityPagePanel } from "@/shared/composite/utility-page";
import { ButtonGroup } from "@/shared/ui/button-group";
import { Field, FieldContent } from "@/shared/ui/field";
import { Button } from "@/shared/ui-extended/button";
import { ContactInfoSection } from "@/features/custom-order/components/contact-info-section";
import { toast } from "@/shared/lib/toast";

const QUANTITY_PRESETS = [4, 8, 12, 20, 50, 100] as const;

export const QuantityStep = () => {
  const { control, watch, setValue } = useFormContext<QuoteOrderOptions>();
  const quantity = watch("quantity");
  const fabricProvided = watch("fabricProvided");
  const prevFabricProvided = useRef(fabricProvided);
  const prevQuantityRef = useRef(quantity);

  // fabricProvided true 전환 시 연관 필드 리셋
  useEffect(() => {
    if (fabricProvided && !prevFabricProvided.current) {
      setValue("reorder", false);
      setValue("fabricType", null);
      setValue("designType", null);
    }
    prevFabricProvided.current = fabricProvided;
  }, [fabricProvided, setValue]);

  useEffect(() => {
    if (prevQuantityRef.current < 100 && quantity >= 100) {
      toast.info("100개 이상은 견적 요청으로 접수됩니다.");
    }
    prevQuantityRef.current = quantity;
  }, [quantity]);

  const handlePresetClick = (preset: number) => {
    setValue("quantity", preset);
  };

  return (
    <div className="space-y-6">
      <UtilityPagePanel title="시작 방식" contentClassName="space-y-3">
        <Field>
          <FieldContent>
            <CheckboxField
              name="fabricProvided"
              control={control}
              label="원단 직접 제공"
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <CheckboxField
              name="reorder"
              control={control}
              label="재주문"
              disabled={fabricProvided}
            />
          </FieldContent>
        </Field>
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

        {quantity >= 100 && <ContactInfoSection control={control} />}
      </UtilityPagePanel>
    </div>
  );
};
