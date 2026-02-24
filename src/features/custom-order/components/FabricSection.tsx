import type { Control, UseFormWatch } from "react-hook-form";
import type { OrderOptions } from "@/features/custom-order/types/order";
import { CheckboxField } from "@/components/composite/check-box-field";
import { SelectField } from "@/components/composite/select-field";
import { FABRIC_TYPES, DESIGN_TYPES } from "@/features/custom-order/constants/FORM_OPTIONS";
import { FormSection } from "@/components/ui/form-section";

interface FabricSectionProps {
  control: Control<OrderOptions>;
  watch: UseFormWatch<OrderOptions>;
}

export const FabricSection = ({ control, watch }: FabricSectionProps) => {
  const watchedValues = watch();

  return (
    <FormSection title="원단 정보">
      <CheckboxField<OrderOptions>
        name="fabricProvided"
        control={control}
        label="원단 직접 제공"
        description="실크, 폴리, 면 소재만 가능하며, 44인치 기준 1마에 4개씩 주문 가능합니다"
      />

      {!watchedValues.fabricProvided && (
        <div className="space-y-6">
          <CheckboxField<OrderOptions>
            name="reorder"
            control={control}
            label="동일 디자인 재주문"
            description="원단 디자인의 색상 및 패턴 수정은 불가능하지만 넥타이의 제작 옵션은 변경 가능합니다"
          />

          {!watchedValues.reorder && (
            <div className="space-y-6">
              <SelectField<OrderOptions>
                name="fabricType"
                control={control}
                label="원단 소재"
                options={FABRIC_TYPES}
              />

              <SelectField<OrderOptions>
                name="designType"
                control={control}
                label="선염&날염"
                options={DESIGN_TYPES}
              />
            </div>
          )}
        </div>
      )}
    </FormSection>
  );
};
