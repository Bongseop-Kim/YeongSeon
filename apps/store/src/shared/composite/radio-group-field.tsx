import type { ReactNode } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import { RadioGroup } from "@/shared/ui/radio-group";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";

interface RadioGroupFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: ReactNode;
  rules?: RegisterOptions<T, Path<T>>;
  radioGroupClassName?: string;
  children: ReactNode;
}

export function RadioGroupField<T extends FieldValues>({
  name,
  control,
  label,
  rules,
  radioGroupClassName,
  children,
}: RadioGroupFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <Field orientation="vertical">
          <FieldLabel>
            <FieldTitle>{label}</FieldTitle>
          </FieldLabel>
          <FieldContent>
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              className={radioGroupClassName}
            >
              {children}
            </RadioGroup>
            <FieldError errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  );
}
