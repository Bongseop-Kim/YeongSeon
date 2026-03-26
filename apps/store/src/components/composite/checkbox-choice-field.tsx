import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { SelectableField } from "@/components/composite/selectable-field";

interface CheckboxChoiceFieldProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}

export function CheckboxChoiceField({
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
  eyebrow,
  title,
  description,
  meta,
  children,
}: CheckboxChoiceFieldProps) {
  return (
    <SelectableField
      id={id}
      selected={checked}
      disabled={disabled}
      className={className}
      eyebrow={eyebrow}
      title={title}
      description={description}
      meta={meta}
      control={
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="mt-0"
        />
      }
    >
      {children}
    </SelectableField>
  );
}
