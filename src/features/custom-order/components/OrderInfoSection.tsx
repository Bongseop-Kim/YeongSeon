import { Controller } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { OrderOptions } from "../types/order";
import { FormSection } from "@/components/ui/form-section";
import { CheckboxField } from "@/components/composite/check-box-field";
import { QuantitySelector } from "./QuantitySelector";
import { ImageUpload } from "./ImageUpload";

interface OrderInfoSectionProps {
  control: Control<OrderOptions>;
  setValue: UseFormSetValue<OrderOptions>;
  watch: UseFormWatch<OrderOptions>;
}

export const OrderInfoSection = ({
  control,
  setValue,
  watch,
}: OrderInfoSectionProps) => {
  return (
    <FormSection title="주문 정보">
      <QuantitySelector control={control} />

      <ImageUpload setValue={setValue} watch={watch} />

      <div>
        <Label
          htmlFor="additionalNotes"
          className="text-sm font-medium text-stone-900 mb-2 block"
        >
          추가 요청사항
        </Label>
        <Controller
          name="additionalNotes"
          control={control}
          render={({ field }) => (
            <Textarea
              id="additionalNotes"
              placeholder="특별한 요청사항이 있으시면 입력해주세요"
              className="min-h-[100px] resize-none"
              {...field}
            />
          )}
        />
      </div>

      <CheckboxField<OrderOptions>
        name="sample"
        control={control}
        label="샘플 제작"
        description="본 주문 전 샘플을 먼저 제작합니다"
      />
    </FormSection>
  );
};
