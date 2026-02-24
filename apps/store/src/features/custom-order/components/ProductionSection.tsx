import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Control } from "react-hook-form";
import type { OrderOptions } from "@/features/custom-order/types/order";
import { FormSection } from "@/components/ui/form-section";
import { SelectField } from "@/components/composite/select-field";
import { CheckboxField } from "@/components/composite/check-box-field";
import {
  TIE_TYPES,
  INTERLINING_TYPES,
  INTERLINING_THICKNESS,
  SIZE_TYPES,
  ADDITIONAL_OPTIONS,
  TIE_WIDTH_CONFIG,
} from "@/features/custom-order/constants/FORM_OPTIONS";

interface ProductionSectionProps {
  control: Control<OrderOptions>;
}

export const ProductionSection = ({ control }: ProductionSectionProps) => {
  return (
    <FormSection title="제작 옵션">
      <SelectField<OrderOptions>
        name="tieType"
        control={control}
        label="봉제 방식"
        options={TIE_TYPES}
      />

      <SelectField<OrderOptions>
        name="interlining"
        control={control}
        label="심지 종류"
        options={INTERLINING_TYPES}
      />

      <SelectField<OrderOptions>
        name="interliningThickness"
        control={control}
        label="심지 두께"
        options={INTERLINING_THICKNESS}
      />

      <SelectField<OrderOptions>
        name="sizeType"
        control={control}
        label="사이즈 타입"
        options={SIZE_TYPES}
      />

      <div>
        <Label className="mb-1">넥타이 폭 (cm)</Label>
        <Controller
          name="tieWidth"
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              min={TIE_WIDTH_CONFIG.min}
              max={TIE_WIDTH_CONFIG.max}
              step={TIE_WIDTH_CONFIG.step}
              value={field.value}
              onChange={(e) => field.onChange(Number(e.target.value))}
              className="w-full"
            />
          )}
        />
      </div>

      <div className="space-y-3">
        <Label>추가 옵션</Label>

        <div className="grid grid-cols-3 gap-4">
          {ADDITIONAL_OPTIONS.map((option) => (
            <CheckboxField<OrderOptions>
              key={option.key}
              name={option.key as keyof OrderOptions}
              control={control}
              label={option.label}
            />
          ))}
        </div>
      </div>
    </FormSection>
  );
};
