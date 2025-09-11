import { Tags } from "lucide-react";
import type { Control } from "react-hook-form";
import type { OrderOptions } from "../types/order";
import { CheckboxField } from "./CheckboxField";
import { LABEL_OPTIONS } from "../constants/FORM_OPTIONS";
import { FormSection } from "@/components/ui/form-section";

interface LabelSectionProps {
  control: Control<OrderOptions>;
}

export const LabelSection = ({ control }: LabelSectionProps) => {
  return (
    <FormSection icon={Tags} title="라벨 옵션">
      <div className="space-y-3">
        {LABEL_OPTIONS.map((option) => (
          <CheckboxField
            key={option.key}
            name={option.key as keyof OrderOptions}
            control={control}
            label={option.label}
            description={option.description}
          />
        ))}
      </div>
    </FormSection>
  );
};
