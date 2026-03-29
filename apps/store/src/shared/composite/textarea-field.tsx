import { useId, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type RegisterOptions,
} from "react-hook-form";
import { Textarea } from "@/shared/ui/textarea";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/shared/ui/field";

interface TextareaFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: ReactNode;
  description?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  rules?: RegisterOptions<T, Path<T>>;
  disabled?: boolean;
  className?: string;
  textareaClassName?: string;
}

export const TextareaField = <T extends FieldValues>({
  name,
  control,
  label,
  description,
  required,
  placeholder,
  maxLength,
  rules,
  disabled,
  className,
  textareaClassName,
}: TextareaFieldProps<T>) => {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => {
        const describedBy = [
          description ? descriptionId : undefined,
          fieldState.error ? errorId : undefined,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Field orientation="vertical" className={className}>
            <FieldLabel htmlFor={id}>
              <FieldTitle>{label}</FieldTitle>
            </FieldLabel>
            {description ? (
              <FieldDescription id={descriptionId}>
                {description}
              </FieldDescription>
            ) : null}
            <FieldContent>
              <Textarea
                {...field}
                id={id}
                placeholder={placeholder}
                maxLength={maxLength}
                disabled={disabled}
                required={required}
                className={textareaClassName}
                aria-invalid={!!fieldState.error}
                aria-describedby={describedBy || undefined}
              />
              <FieldError id={errorId} errors={[fieldState.error]} />
            </FieldContent>
          </Field>
        );
      }}
    />
  );
};
