import { Controller } from "react-hook-form";
import { Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Control } from "react-hook-form";
import type { OrderOptions } from "../types/order";
import { FormSection } from "./FormSection";
import { SelectField } from "./SelectField";
import { CheckboxField } from "./CheckboxField";
import {
  TIE_TYPES,
  INTERLINING_TYPES,
  INTERLINING_THICKNESS,
  SIZE_TYPES,
  ADDITIONAL_OPTIONS,
  TIE_WIDTH_CONFIG,
} from "../constants/formOptions";

interface ProductionSectionProps {
  control: Control<OrderOptions>;
}

export const ProductionSection = ({ control }: ProductionSectionProps) => {
  return (
    <FormSection icon={Settings} title="제작 옵션">
      <SelectField
        name="tieType"
        control={control}
        label="봉제 방식"
        options={TIE_TYPES}
      />

      <SelectField
        name="interlining"
        control={control}
        label="심지 종류"
        options={INTERLINING_TYPES}
      />

      <SelectField
        name="interliningThickness"
        control={control}
        label="심지 두께"
        options={INTERLINING_THICKNESS}
      />

      <SelectField
        name="sizeType"
        control={control}
        label="사이즈 타입"
        options={SIZE_TYPES}
      />

      <div>
        <Label className="text-sm font-medium text-stone-900 mb-2 block">
          넥타이 폭 (cm)
        </Label>
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
        <Label className="text-sm font-medium text-stone-900 block">
          추가 옵션
        </Label>

        <div className="grid grid-cols-3 gap-4">
          {ADDITIONAL_OPTIONS.map((option) => (
            <CheckboxField
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
