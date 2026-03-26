import { useId, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import { Input } from "@/components/ui-extended/input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";

interface InputFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: ReactNode;
  description?: string;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  unit?: string;
  rules?: RegisterOptions<T, Path<T>>;
  disabled?: boolean;
  className?: string;
}

export const InputField = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  type,
  placeholder,
  unit,
  rules,
  disabled,
  className,
}: InputFieldProps<T>) => {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <Field orientation="vertical" className={className}>
          <FieldLabel htmlFor={id}>
            <FieldTitle>{label}</FieldTitle>
          </FieldLabel>
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          <FieldContent>
            <Input
              {...field}
              id={id}
              type={type}
              placeholder={placeholder}
              unit={unit}
              disabled={disabled}
              required={required}
              aria-invalid={!!fieldState.error}
              aria-describedby={fieldState.error ? errorId : undefined}
            />
            <FieldError id={errorId} errors={[fieldState.error]} />
          </FieldContent>
        </Field>
      )}
    />
  );
};
