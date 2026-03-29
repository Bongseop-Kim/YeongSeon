import type { ReactNode } from "react";
import { RadioChoiceField } from "@/shared/composite/radio-choice-field";
import { RadioGroup } from "@/shared/ui/radio-group";

interface RadioChoiceOption {
  value: string;
  id: string;
  selected: boolean;
  title: string;
  description: string;
  meta?: ReactNode;
}

interface RadioChoiceOptionGridProps {
  value?: string | null;
  onValueChange: (value: string) => void;
  options: RadioChoiceOption[];
}

export function RadioChoiceOptionGrid({
  value,
  onValueChange,
  options,
}: RadioChoiceOptionGridProps) {
  return (
    <RadioGroup value={value} onValueChange={onValueChange}>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {options.map((option) => (
          <RadioChoiceField
            key={option.value}
            value={option.value}
            id={option.id}
            selected={option.selected}
            variant="row"
            title={option.title}
            description={option.description}
            meta={option.meta}
          />
        ))}
      </div>
    </RadioGroup>
  );
}
