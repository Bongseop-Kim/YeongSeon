import type { ReactNode } from "react";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { SelectableField } from "@/components/composite/selectable-field";

interface RadioChoiceFieldProps {
  value: string;
  id: string;
  selected: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "row" | "panel";
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

export function RadioChoiceField({
  value,
  id,
  selected,
  disabled,
  className,
  variant = "row",
  eyebrow,
  title,
  description,
  meta,
  badge,
  footer,
  children,
}: RadioChoiceFieldProps) {
  return (
    <SelectableField
      id={id}
      selected={selected}
      disabled={disabled}
      className={className}
      variant={variant}
      eyebrow={eyebrow}
      title={title}
      description={description}
      meta={meta}
      badge={badge}
      footer={footer}
      control={
        <RadioGroupItem
          value={value}
          id={id}
          disabled={disabled}
          className={variant === "panel" ? "mt-1" : undefined}
        />
      }
    >
      {children}
    </SelectableField>
  );
}
